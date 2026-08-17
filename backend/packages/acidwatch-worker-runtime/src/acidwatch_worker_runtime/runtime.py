import asyncio
import logging
import os
from datetime import datetime
from uuid import UUID, uuid4

from pydantic import ValidationError

from acidwatch_models import BaseAdapter, get_metas, get_phases
from acidwatch_models.datamodel import Conditions

from acidwatch_messaging import (
    AdapterJob,
    AdapterResult,
    HEARTBEATS_QUEUE,
    Heartbeat,
    Message,
    RESULTS_QUEUE,
    Transport,
    create_transport,
    job_queue_name,
)

logger = logging.getLogger(__name__)


async def run_adapter_job(
    adapter_type: type[BaseAdapter], job: AdapterJob
) -> AdapterResult:
    if job.model_id != adapter_type.model_id:
        return AdapterResult(
            model_input_id=job.model_input_id,
            error=f"Worker cannot run model '{job.model_id}'",
        )
    try:
        adapter = adapter_type(
            parameters=job.parameters,
            conditions=job.conditions,
        )
        adapter.set_concentrations(job.concentrations)
        output = await adapter.run()
        phases = adapter.merge_passthrough(get_phases(output))
        return AdapterResult(
            model_input_id=job.model_input_id,
            phases=phases,
            panels=get_metas(output),
        )
    except Exception as exc:
        logger.exception(
            "Adapter %s failed for model_input %s",
            job.model_id,
            job.model_input_id,
        )
        return AdapterResult(
            model_input_id=job.model_input_id,
            error=f"{type(exc).__name__}: {exc}",
        )


def run_adapter_standalone(
    adapter_type: type[BaseAdapter],
    concentrations: dict[str, int | float],
    *,
    parameters: dict[str, bool | float | int | str] | None = None,
    conditions: Conditions | None = None,
) -> AdapterResult:
    """Run one adapter calculation synchronously without starting a worker.

    This is intended for local development and standalone testing. Deployed
    workers should use run_worker_from_environment instead.
    """
    return asyncio.run(
        run_adapter_job(
            adapter_type,
            AdapterJob(
                model_input_id=uuid4(),
                model_id=adapter_type.model_id,
                concentrations=concentrations,
                parameters=parameters or {},
                conditions=conditions or Conditions(),
            ),
        )
    )


class AdapterWorker:
    def __init__(
        self,
        adapter_type: type[BaseAdapter],
        transport: Transport,
        *,
        heartbeat_interval: float = 30,
    ) -> None:
        self._adapter_type = adapter_type
        self._transport = transport
        self._heartbeat_interval = heartbeat_interval
        self._instance_id = str(uuid4())
        self._job_id: UUID | None = None

    async def run(self) -> None:
        heartbeat_task = asyncio.create_task(
            self._publish_heartbeats(),
            name=f"{self._adapter_type.model_id}-heartbeats",
        )
        try:
            async for message in self._transport.messages(
                job_queue_name(self._adapter_type.model_id)
            ):
                await self._process_message(message)
        finally:
            heartbeat_task.cancel()
            await asyncio.gather(heartbeat_task, return_exceptions=True)

    async def _process_message(self, message: Message) -> None:
        try:
            job = AdapterJob.model_validate(message.body)
        except ValidationError:
            logger.exception("Rejecting invalid adapter job")
            await message.reject()
            return

        self._job_id = job.model_input_id
        await self._send_heartbeat()
        try:
            result = await run_adapter_job(self._adapter_type, job)
            await self._transport.publish(RESULTS_QUEUE, result)
            await message.ack()
        finally:
            self._job_id = None

    async def _send_heartbeat(self) -> None:
        await self._transport.publish(
            HEARTBEATS_QUEUE,
            Heartbeat(
                model_id=self._adapter_type.model_id,
                instance_id=self._instance_id,
                timestamp=datetime.now(),
                job_id=str(self._job_id) if self._job_id else None,
            ),
        )

    async def _publish_heartbeats(self) -> None:
        while True:
            try:
                await self._send_heartbeat()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception(
                    "Failed to publish heartbeat for %s",
                    self._adapter_type.model_id,
                )
            await asyncio.sleep(self._heartbeat_interval)


async def run_worker(
    adapter_type: type[BaseAdapter],
    broker_url: str,
    backend: str = "",
) -> None:
    queues = [
        job_queue_name(adapter_type.model_id),
        RESULTS_QUEUE,
        HEARTBEATS_QUEUE,
    ]
    transport = create_transport(broker_url, queues, backend)
    async with transport:
        await AdapterWorker(adapter_type, transport).run()


def run_worker_from_environment(adapter_type: type[BaseAdapter]) -> None:
    broker_url = os.environ.get("BROKER_URL")
    if broker_url is None:
        raise RuntimeError("BROKER_URL must be configured")
    asyncio.run(
        run_worker(
            adapter_type,
            broker_url,
            os.environ.get("BROKER_TRANSPORT", ""),
        )
    )

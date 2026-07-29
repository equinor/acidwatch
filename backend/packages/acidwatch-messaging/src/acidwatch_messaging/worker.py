import asyncio
import logging
import os

from acidwatch_models import BaseAdapter, get_metas, get_phases

from .contracts import AdapterJob, AdapterResult
from .transports import WorkerTransport, create_worker_transport


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
            jwt_token=None,
            access_token=job.access_token,
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


class AdapterWorker:
    def __init__(
        self,
        adapter_type: type[BaseAdapter],
        transport: WorkerTransport,
    ) -> None:
        self._adapter_type = adapter_type
        self._transport = transport

    async def run_job(self, job: AdapterJob) -> AdapterResult:
        return await run_adapter_job(self._adapter_type, job)

    async def run(self) -> None:
        try:
            await self._transport.run(self.run_job)
        finally:
            await self._transport.shutdown()


def run_worker(
    adapter_type: type[BaseAdapter],
    broker_url: str,
    backend: str = "",
) -> None:
    transport = create_worker_transport(broker_url, adapter_type.model_id, backend)
    asyncio.run(AdapterWorker(adapter_type, transport).run())


def run_worker_from_environment(
    adapter_type: type[BaseAdapter],
) -> None:
    broker_url = os.environ.get("BROKER_URL")
    if broker_url is None:
        raise RuntimeError("BROKER_URL must be configured")
    run_worker(
        adapter_type,
        broker_url,
        os.environ.get("TRANSPORT_BACKEND", ""),
    )

import argparse
import asyncio
import logging
from collections.abc import Sequence

from acidwatch_api.adapters.base import BaseAdapter, get_metas, get_phases
from acidwatch_api.adapters.registry import get_adapters
from acidwatch_api.message_broker import (
    AdapterJob,
    AdapterResult,
    WorkerTransport,
    create_worker_transport,
)
from acidwatch_api.settings import SETTINGS


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


async def run_workers(workers: list[AdapterWorker]) -> None:
    await asyncio.gather(*(worker.run() for worker in workers))


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("model_ids", nargs="+")
    args = parser.parse_args(argv)

    adapters = get_adapters()
    unknown_models = [
        model_id for model_id in args.model_ids if model_id not in adapters
    ]
    if unknown_models:
        parser.error(f"unknown model '{unknown_models[0]}'")

    broker_url = SETTINGS.broker_url
    if broker_url is None:
        parser.error("BROKER_URL must be configured")

    backend = SETTINGS.transport_backend
    workers = [
        AdapterWorker(
            adapters[model_id],
            create_worker_transport(broker_url, model_id, backend),
        )
        for model_id in args.model_ids
    ]
    asyncio.run(run_workers(workers))


if __name__ == "__main__":
    main()

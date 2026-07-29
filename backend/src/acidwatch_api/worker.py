import argparse
import asyncio
import logging
import os
from collections.abc import Sequence

from acidwatch_api.adapters.base import BaseAdapter, get_metas, get_phases
from acidwatch_api.adapters.registry import get_adapters
from acidwatch_api.message_broker import (
    AdapterJob,
    AdapterResult,
    WorkerTransport,
    create_worker_transport,
)


logger = logging.getLogger(__name__)


class AdapterWorker:
    def __init__(
        self,
        adapter_type: type[BaseAdapter],
        transport: WorkerTransport,
    ) -> None:
        self._adapter_type = adapter_type
        self._transport = transport

    async def run_job(self, job: AdapterJob) -> AdapterResult:
        if job.model_id != self._adapter_type.model_id:
            return AdapterResult(
                model_input_id=job.model_input_id,
                error=f"Worker cannot run model '{job.model_id}'",
            )
        try:
            adapter = self._adapter_type(
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

    async def run(self) -> None:
        try:
            await self._transport.run(self.run_job)
        finally:
            await self._transport.shutdown()


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("model_id")
    args = parser.parse_args(argv)

    adapters = get_adapters()
    adapter_type = adapters.get(args.model_id)
    if adapter_type is None:
        parser.error(f"unknown model '{args.model_id}'")

    broker_url = os.environ.get("BROKER_URL")
    if broker_url is None:
        parser.error("BROKER_URL must be configured")

    transport = create_worker_transport(
        broker_url,
        args.model_id,
        os.environ.get("TRANSPORT_BACKEND", ""),
    )
    asyncio.run(AdapterWorker(adapter_type, transport).run())


if __name__ == "__main__":
    main()

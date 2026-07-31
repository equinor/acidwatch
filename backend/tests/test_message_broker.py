import asyncio
from uuid import uuid4

from acidwatch_api.message_broker import AdapterJob, AdapterResult
from acidwatch_messaging.transports import (
    RabbitApiTransport,
    ServiceBusApiTransport,
    create_api_transport,
)
from acidwatch_models.datamodel import Conditions, Phase


def test_adapter_messages_round_trip_as_json():
    job = AdapterJob(
        model_input_id=uuid4(),
        model_id="example",
        concentrations={"H2O": 1},
        parameters={"temperature": 25},
        conditions=Conditions(),
    )
    result = AdapterResult(
        model_input_id=job.model_input_id,
        phases=[
            Phase(
                kind="co2-rich",
                fraction=1,
                concentrations=job.concentrations,
            )
        ],
    )

    assert AdapterJob.model_validate_json(job.model_dump_json()) == job
    assert AdapterResult.model_validate_json(result.model_dump_json()) == result


def test_transport_is_selected_from_connection_string():
    rabbit = create_api_transport("******localhost/")
    service_bus = create_api_transport("Endpoint=sb://example/")

    assert isinstance(rabbit, RabbitApiTransport)
    assert isinstance(service_bus, ServiceBusApiTransport)


async def test_concurrent_publishes_do_not_overlap_on_a_sender():
    """ServiceBusSender is not safe for concurrent use.

    Its AMQP link is opened lazily, so parallel callers race in ``_open()``
    and can observe a handler another coroutine replaced or closed.
    """
    overlapping = 0
    in_flight = 0

    class FakeSender:
        async def send_messages(self, message):
            nonlocal overlapping, in_flight
            in_flight += 1
            if in_flight > 1:
                overlapping += 1
            await asyncio.sleep(0)
            in_flight -= 1

    transport = ServiceBusApiTransport("Endpoint=sb://example/")
    transport._senders = {"acidwatch.example": FakeSender()}
    transport._send_locks = {"acidwatch.example": asyncio.Lock()}

    job = AdapterJob(
        model_input_id=uuid4(),
        model_id="example",
        concentrations={"H2O": 1},
        parameters={},
        conditions=Conditions(),
    )

    await asyncio.gather(*(transport._publish(job, str(uuid4())) for _ in range(25)))

    assert overlapping == 0

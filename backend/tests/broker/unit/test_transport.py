import asyncio
from unittest.mock import AsyncMock, call
from uuid import uuid4

from acidwatch_messaging import (
    AdapterResult,
    AzureServiceBusTransport,
    DEAD_LETTER_QUEUE,
    RESULTS_QUEUE,
    RabbitMQTransport,
)


async def test_results_queue_automatically_declares_dead_letter_queue():
    channel = AsyncMock()
    transport = RabbitMQTransport("******localhost/", [RESULTS_QUEUE])

    await transport._declare_queues(channel)

    assert channel.declare_queue.await_args_list == [
        call(DEAD_LETTER_QUEUE, durable=True),
        call(
            RESULTS_QUEUE,
            durable=True,
            arguments={
                "x-dead-letter-exchange": "",
                "x-dead-letter-routing-key": DEAD_LETTER_QUEUE,
            },
        ),
    ]


async def test_concurrent_azure_publishes_do_not_overlap_on_sender():
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

        async def close(self):
            pass

    class FakeClient:
        def __init__(self):
            self.sender = FakeSender()

        def get_queue_sender(self, queue_name):
            return self.sender

    transport = AzureServiceBusTransport("Endpoint=sb://example/", [])
    transport._client = FakeClient()
    result = AdapterResult(model_input_id=uuid4())

    await asyncio.gather(
        *(transport.publish("acidwatch.results", result) for _ in range(25))
    )

    assert overlapping == 0
    assert len(transport._senders) == 1

from unittest.mock import AsyncMock, call

from acidwatch_messaging import (
    DEAD_LETTER_QUEUE,
    RESULTS_QUEUE,
    RabbitMQTransport,
)


async def test_results_queue_automatically_declares_dead_letter_queue():
    channel = AsyncMock()
    transport = RabbitMQTransport("amqp://localhost/", [RESULTS_QUEUE])

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

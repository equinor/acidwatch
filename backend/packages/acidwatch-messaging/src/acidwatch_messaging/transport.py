from __future__ import annotations

import json
from collections.abc import AsyncIterator
from types import TracebackType
from typing import Any, Protocol, Self

import aio_pika
from pamqp.common import FieldTable
from pydantic import BaseModel

from acidwatch_messaging.queues import DEAD_LETTER_QUEUE, RESULTS_QUEUE

Payload = BaseModel | dict[str, Any]


def _payload_json(payload: Payload) -> str:
    if isinstance(payload, BaseModel):
        return payload.model_dump_json()
    return json.dumps(payload)


class Message(Protocol):
    body: dict[str, Any]

    async def ack(self) -> None: ...

    async def reject(self) -> None: ...


class Transport(Protocol):
    async def publish(self, queue_name: str, payload: Payload) -> None: ...

    def messages(self, queue_name: str) -> AsyncIterator[Message]: ...


class RabbitMQMessage:
    def __init__(self, message: aio_pika.abc.AbstractIncomingMessage):
        self._message = message
        self.body: dict[str, Any] = json.loads(message.body)

    async def ack(self) -> None:
        await self._message.ack()

    async def reject(self) -> None:
        await self._message.reject(requeue=False)


class RabbitMQTransport:
    def __init__(self, broker_url: str, queue_names: list[str]):
        self._broker_url = broker_url
        self._queue_names = list(dict.fromkeys(queue_names))
        self._connection: aio_pika.abc.AbstractRobustConnection | None = None
        self._publish_channel: aio_pika.abc.AbstractChannel | None = None

    async def __aenter__(self) -> Self:
        self._connection = await aio_pika.connect_robust(self._broker_url)
        self._publish_channel = await self._connection.channel(publisher_confirms=True)
        await self._declare_queues(self._publish_channel)
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        if self._connection is not None:
            await self._connection.close()

    async def _declare_queues(self, channel: aio_pika.abc.AbstractChannel) -> None:
        if RESULTS_QUEUE in self._queue_names:
            await channel.declare_queue(DEAD_LETTER_QUEUE, durable=True)

        for queue_name in self._queue_names:
            if queue_name == DEAD_LETTER_QUEUE:
                continue
            arguments: FieldTable | None = None
            if queue_name == RESULTS_QUEUE:
                arguments = {
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": DEAD_LETTER_QUEUE,
                }
            await channel.declare_queue(
                queue_name,
                durable=True,
                arguments=arguments,
            )

    async def publish(self, queue_name: str, payload: Payload) -> None:
        if self._publish_channel is None:
            raise RuntimeError("Transport is not open")
        await self._publish_channel.default_exchange.publish(
            aio_pika.Message(
                body=_payload_json(payload).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                content_type="application/json",
            ),
            routing_key=queue_name,
            mandatory=True,
        )

    async def messages(self, queue_name: str) -> AsyncIterator[Message]:
        if self._connection is None:
            raise RuntimeError("Transport is not open")

        channel = await self._connection.channel()
        await channel.set_qos(prefetch_count=1)
        try:
            queue = await channel.declare_queue(queue_name, passive=True)
            async with queue.iterator() as messages:
                async for message in messages:
                    yield RabbitMQMessage(message)
        finally:
            await channel.close()

import asyncio
import logging
from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable
from typing import Any
from uuid import uuid4

import aio_pika
from aio_pika.abc import (
    AbstractChannel,
    AbstractExchange,
    AbstractQueue,
    AbstractRobustConnection,
)
from azure.servicebus import ServiceBusMessage
from azure.servicebus.aio import ServiceBusClient

from .contracts import AdapterJob, AdapterResult


RESULTS_QUEUE = "acidwatch.results"
MESSAGE_LOCK_RENEWAL_SECONDS = 600
logger = logging.getLogger(__name__)


def detect_backend(broker_url: str, backend: str = "") -> str:
    selected = backend.strip().lower()
    if selected in {"rabbitmq", "servicebus"}:
        return selected
    return "servicebus" if broker_url.startswith("Endpoint=") else "rabbitmq"


def _servicebus_body(message: Any) -> bytes:
    body = message.body
    if isinstance(body, bytes):
        return body
    if isinstance(body, str):
        return body.encode()
    return b"".join(
        part if isinstance(part, bytes) else str(part).encode() for part in body
    )


class ApiTransport(ABC):
    @abstractmethod
    async def startup(self, model_ids: list[str]) -> None:
        raise NotImplementedError

    @abstractmethod
    async def request(self, job: AdapterJob, timeout: float) -> AdapterResult:
        raise NotImplementedError

    @abstractmethod
    async def shutdown(self) -> None:
        raise NotImplementedError


class InProcessApiTransport(ApiTransport):
    def __init__(
        self, handler: Callable[[AdapterJob], Awaitable[AdapterResult]]
    ) -> None:
        self._handler = handler

    async def startup(self, model_ids: list[str]) -> None:
        pass

    async def request(self, job: AdapterJob, timeout: float) -> AdapterResult:
        return await asyncio.wait_for(self._handler(job), timeout)

    async def shutdown(self) -> None:
        pass


class _CorrelatedApiTransport(ApiTransport):
    def __init__(self) -> None:
        self._pending: dict[str, asyncio.Future[AdapterResult]] = {}
        self._consumer_task: asyncio.Task[None] | None = None

    async def request(self, job: AdapterJob, timeout: float) -> AdapterResult:
        correlation_id = str(uuid4())
        future = asyncio.get_running_loop().create_future()
        self._pending[correlation_id] = future
        try:
            await self._publish(job, correlation_id)
            return await asyncio.wait_for(future, timeout)
        finally:
            self._pending.pop(correlation_id, None)

    def _resolve(self, correlation_id: str | None, result: AdapterResult) -> None:
        if correlation_id is None:
            return
        future = self._pending.get(correlation_id)
        if future is not None and not future.done():
            future.set_result(result)

    async def shutdown(self) -> None:
        if self._consumer_task is not None:
            self._consumer_task.cancel()
            try:
                await self._consumer_task
            except asyncio.CancelledError:
                pass
        for future in self._pending.values():
            if not future.done():
                future.cancel()
        self._pending.clear()
        await self._shutdown()

    @abstractmethod
    async def _publish(self, job: AdapterJob, correlation_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    async def _shutdown(self) -> None:
        raise NotImplementedError


class RabbitApiTransport(_CorrelatedApiTransport):
    def __init__(self, broker_url: str, results_queue: str = RESULTS_QUEUE) -> None:
        super().__init__()
        self._broker_url = broker_url
        self._results_queue_name = results_queue
        self._connection: AbstractRobustConnection | None = None
        self._channel: AbstractChannel | None = None
        self._exchange: AbstractExchange | None = None
        self._results_queue: AbstractQueue | None = None

    async def startup(self, model_ids: list[str]) -> None:
        connection = await aio_pika.connect_robust(self._broker_url)
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            "acidwatch", aio_pika.ExchangeType.DIRECT, durable=True
        )
        for model_id in model_ids:
            queue_name = f"acidwatch.{model_id}"
            queue = await channel.declare_queue(queue_name, durable=True)
            await queue.bind(exchange, queue_name)
        results_queue = await channel.declare_queue(
            self._results_queue_name, durable=True
        )
        self._connection = connection
        self._channel = channel
        self._exchange = exchange
        self._results_queue = results_queue
        self._consumer_task = asyncio.create_task(self._consume_results())

    async def _publish(self, job: AdapterJob, correlation_id: str) -> None:
        if self._exchange is None:
            raise RuntimeError("Message broker is not started")
        message = aio_pika.Message(
            body=job.model_dump_json().encode(),
            content_type="application/json",
            correlation_id=correlation_id,
            reply_to=self._results_queue_name,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await self._exchange.publish(message, routing_key=f"acidwatch.{job.model_id}")

    async def _consume_results(self) -> None:
        if self._results_queue is None:
            raise RuntimeError("Results queue is not available")
        async with self._results_queue.iterator() as messages:
            async for message in messages:
                try:
                    async with message.process(requeue=False):
                        result = AdapterResult.model_validate_json(message.body)
                        self._resolve(message.correlation_id, result)
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception("Discarding invalid adapter result")

    async def _shutdown(self) -> None:
        if self._channel is not None and not self._channel.is_closed:
            await self._channel.close()
        if self._connection is not None and not self._connection.is_closed:
            await self._connection.close()


class ServiceBusApiTransport(_CorrelatedApiTransport):
    def __init__(self, connection_string: str, results_queue: str = RESULTS_QUEUE):
        super().__init__()
        self._connection_string = connection_string
        self._results_queue_name = results_queue
        self._client: ServiceBusClient | None = None
        self._senders: dict[str, Any] = {}
        self._send_locks: dict[str, asyncio.Lock] = {}
        self._receiver: Any = None

    async def startup(self, model_ids: list[str]) -> None:
        self._client = ServiceBusClient.from_connection_string(self._connection_string)
        for model_id in model_ids:
            queue_name = f"acidwatch.{model_id}"
            self._senders[queue_name] = self._client.get_queue_sender(queue_name)
            self._send_locks[queue_name] = asyncio.Lock()
        self._receiver = self._client.get_queue_receiver(self._results_queue_name)
        self._consumer_task = asyncio.create_task(self._consume_results())

    async def _publish(self, job: AdapterJob, correlation_id: str) -> None:
        queue_name = f"acidwatch.{job.model_id}"
        sender = self._senders.get(queue_name)
        lock = self._send_locks.get(queue_name)
        if sender is None or lock is None:
            raise RuntimeError(f"No queue configured for model '{job.model_id}'")
        # ServiceBusSender opens its AMQP link lazily and is not safe for
        # concurrent use: parallel senders race in _open() and can observe a
        # handler that another coroutine has replaced or closed.
        async with lock:
            await sender.send_messages(
                ServiceBusMessage(
                    job.model_dump_json(),
                    content_type="application/json",
                    correlation_id=correlation_id,
                    reply_to=self._results_queue_name,
                )
            )

    async def _consume_results(self) -> None:
        if self._receiver is None:
            raise RuntimeError("Results queue is not available")
        while True:
            try:
                messages = await self._receiver.receive_messages(
                    max_message_count=20, max_wait_time=2
                )
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Failed to receive adapter results")
                await asyncio.sleep(1)
                continue
            for message in messages:
                try:
                    result = AdapterResult.model_validate_json(
                        _servicebus_body(message)
                    )
                    self._resolve(message.correlation_id, result)
                    await self._receiver.complete_message(message)
                except Exception:
                    logger.exception("Discarding invalid adapter result")
                    try:
                        await self._receiver.dead_letter_message(
                            message,
                            reason="Invalid adapter result",
                        )
                    except Exception:
                        logger.exception("Failed to dead-letter adapter result")

    async def _shutdown(self) -> None:
        for sender in self._senders.values():
            await sender.close()
        self._senders.clear()
        self._send_locks.clear()
        if self._receiver is not None:
            await self._receiver.close()
        if self._client is not None:
            await self._client.close()


class WorkerTransport(ABC):
    @abstractmethod
    async def run(
        self, handler: Callable[[AdapterJob], Awaitable[AdapterResult]]
    ) -> None:
        raise NotImplementedError

    @abstractmethod
    async def shutdown(self) -> None:
        raise NotImplementedError


class RabbitWorkerTransport(WorkerTransport):
    def __init__(self, broker_url: str, queue_name: str) -> None:
        self._broker_url = broker_url
        self._queue_name = queue_name
        self._connection: AbstractRobustConnection | None = None
        self._channel: AbstractChannel | None = None

    async def run(
        self, handler: Callable[[AdapterJob], Awaitable[AdapterResult]]
    ) -> None:
        connection = await aio_pika.connect_robust(self._broker_url)
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            "acidwatch", aio_pika.ExchangeType.DIRECT, durable=True
        )
        queue = await channel.declare_queue(self._queue_name, durable=True)
        await queue.bind(exchange, self._queue_name)
        await channel.set_qos(prefetch_count=1)
        self._connection = connection
        self._channel = channel
        async with queue.iterator() as messages:
            async for message in messages:
                try:
                    async with message.process(requeue=True):
                        try:
                            job = AdapterJob.model_validate_json(message.body)
                        except Exception:
                            logger.exception("Discarding invalid adapter job")
                            continue
                        result = await handler(job)
                        if message.reply_to is not None:
                            await channel.default_exchange.publish(
                                aio_pika.Message(
                                    body=result.model_dump_json().encode(),
                                    content_type="application/json",
                                    correlation_id=message.correlation_id,
                                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                                ),
                                routing_key=message.reply_to,
                            )
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception("Adapter job delivery failed")

    async def shutdown(self) -> None:
        if self._channel is not None and not self._channel.is_closed:
            await self._channel.close()
        if self._connection is not None and not self._connection.is_closed:
            await self._connection.close()


class ServiceBusWorkerTransport(WorkerTransport):
    def __init__(self, connection_string: str, queue_name: str) -> None:
        self._connection_string = connection_string
        self._queue_name = queue_name
        self._client: ServiceBusClient | None = None
        self._receiver: Any = None
        self._senders: dict[str, Any] = {}

    async def run(
        self, handler: Callable[[AdapterJob], Awaitable[AdapterResult]]
    ) -> None:
        self._client = ServiceBusClient.from_connection_string(self._connection_string)
        self._receiver = self._client.get_queue_receiver(
            self._queue_name,
            max_auto_lock_renewal_duration=MESSAGE_LOCK_RENEWAL_SECONDS,
        )
        while True:
            try:
                messages = await self._receiver.receive_messages(
                    max_message_count=1, max_wait_time=5
                )
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Failed to receive adapter jobs")
                await asyncio.sleep(1)
                continue
            for message in messages:
                try:
                    try:
                        job = AdapterJob.model_validate_json(_servicebus_body(message))
                    except Exception:
                        logger.exception("Dead-lettering invalid adapter job")
                        await self._receiver.dead_letter_message(
                            message,
                            reason="Invalid adapter job",
                        )
                        continue
                    result = await handler(job)
                    if message.reply_to is not None:
                        sender = self._senders.get(message.reply_to)
                        if sender is None:
                            sender = self._client.get_queue_sender(message.reply_to)
                            self._senders[message.reply_to] = sender
                        await sender.send_messages(
                            ServiceBusMessage(
                                result.model_dump_json(),
                                content_type="application/json",
                                correlation_id=message.correlation_id,
                            )
                        )
                    await self._receiver.complete_message(message)
                except Exception:
                    logger.exception("Adapter job delivery failed")
                    try:
                        await self._receiver.abandon_message(message)
                    except Exception:
                        logger.exception("Failed to abandon adapter job")

    async def shutdown(self) -> None:
        for sender in self._senders.values():
            await sender.close()
        self._senders.clear()
        if self._receiver is not None:
            await self._receiver.close()
        if self._client is not None:
            await self._client.close()


def create_api_transport(
    broker_url: str,
    backend: str = "",
    results_queue: str = RESULTS_QUEUE,
) -> ApiTransport:
    if detect_backend(broker_url, backend) == "servicebus":
        return ServiceBusApiTransport(broker_url, results_queue)
    return RabbitApiTransport(broker_url, results_queue)


def create_worker_transport(
    broker_url: str,
    model_id: str,
    backend: str = "",
) -> WorkerTransport:
    queue_name = f"acidwatch.{model_id}"
    if detect_backend(broker_url, backend) == "servicebus":
        return ServiceBusWorkerTransport(broker_url, queue_name)
    return RabbitWorkerTransport(broker_url, queue_name)

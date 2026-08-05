from acidwatch_messaging import (
    AzureServiceBusTransport,
    Message,
    RabbitMQTransport,
    Transport,
)
from acidwatch_messaging.transport import (
    AzureServiceBusMessage,
    RabbitMQMessage,
)


def accept_message(message: Message) -> None:
    pass


def accept_transport(transport: Transport) -> None:
    pass


def verify_message_protocols(
    rabbitmq: RabbitMQMessage,
    service_bus: AzureServiceBusMessage,
) -> None:
    accept_message(rabbitmq)
    accept_message(service_bus)


def verify_transport_protocols(
    rabbitmq: RabbitMQTransport,
    service_bus: AzureServiceBusTransport,
) -> None:
    accept_transport(rabbitmq)
    accept_transport(service_bus)

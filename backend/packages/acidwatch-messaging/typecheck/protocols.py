from acidwatch_messaging import Message, RabbitMQTransport, Transport
from acidwatch_messaging.transport import RabbitMQMessage


def accept_message(message: Message) -> None:
    pass


def accept_transport(transport: Transport) -> None:
    pass


def verify_message_protocol(message: RabbitMQMessage) -> None:
    accept_message(message)


def verify_transport_protocol(transport: RabbitMQTransport) -> None:
    accept_transport(transport)

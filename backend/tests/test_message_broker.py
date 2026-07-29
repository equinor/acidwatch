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

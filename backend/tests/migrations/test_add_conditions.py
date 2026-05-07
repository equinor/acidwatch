import json
from datetime import datetime
from uuid import UUID

from sqlalchemy import text


def _json_value(value):
    if isinstance(value, str):
        return json.loads(value)
    return value


def test_migration_moves_conditions_up_and_down(alembic_runner, alembic_engine):
    alembic_runner.migrate_up_before("9b4e2c1a7d50")

    simulation_id = UUID(int=100)
    model_input_id = UUID(int=101)
    result_id = UUID(int=102)

    simulation_data = {
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "id": simulation_id,
        "owner_id": None,
        "concentrations": '{"H2O": 2.0}',
    }

    alembic_runner.insert_into("simulations", simulation_data)

    model_input_data = {
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "id": model_input_id,
        "simulation_id": simulation_id,
        "previous_model_input_id": None,
        "model_id": "gibbs",
        "parameters": '{"temperature": 300, "pressure": 10, "equation_of_state": "SRK"}',
    }
    alembic_runner.insert_into("model_inputs", model_input_data)

    result_data = {
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "id": result_id,
        "model_input_id": model_input_id,
        "concentrations": '{"H2O": 1.0}',
        "panels": "[]",
    }
    alembic_runner.insert_into("results", result_data)

    alembic_runner.migrate_up_one()

    with alembic_engine.connect() as conn:
        simulation_row = conn.execute(
            text("SELECT conditions FROM simulations WHERE id = :simulation_id"),
            {"simulation_id": simulation_id},
        ).fetchone()
        assert simulation_row is not None
        assert _json_value(simulation_row[0]) == {"temperature": 300, "pressure": 10}

        model_input_row = conn.execute(
            text("SELECT parameters FROM model_inputs WHERE id = :model_input_id"),
            {"model_input_id": model_input_id},
        ).fetchone()
        assert model_input_row is not None
        assert _json_value(model_input_row[0]) == {"equation_of_state": "SRK"}

        result_row = conn.execute(
            text("SELECT model_input_id FROM results WHERE id = :result_id"),
            {"result_id": result_id},
        ).fetchone()
        assert result_row == (model_input_id,)

    alembic_runner.migrate_down_one()

    with alembic_engine.connect() as conn:
        model_input_row = conn.execute(
            text("SELECT parameters FROM model_inputs WHERE id = :model_input_id"),
            {"model_input_id": model_input_id},
        ).fetchone()
        assert model_input_row is not None
        assert _json_value(model_input_row[0]) == {
            "temperature": 300,
            "pressure": 10,
            "equation_of_state": "SRK",
        }

        result_row = conn.execute(
            text("SELECT model_input_id FROM results WHERE id = :result_id"),
            {"result_id": result_id},
        ).fetchone()
        assert result_row == (model_input_id,)

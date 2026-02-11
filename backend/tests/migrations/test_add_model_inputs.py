from uuid import UUID
from sqlalchemy import text
from datetime import datetime


def test_migration_up_and_down(alembic_runner, alembic_engine):
    alembic_runner.migrate_up_before("01aaa143d690")

    simulations_id = UUID(int=1)
    simulations_data = {
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "id": simulations_id,
        "owner_id": None,
        "concentrations": '{"H2O": 2.0}',
        "parameters": "{}",
        "model_id": "dummy",
    }
    alembic_runner.insert_into("simulations", simulations_data)

    results_data = {
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "id": UUID(int=2),
        "simulation_id": UUID(int=1),
        "concentrations": '{"H2O": 1.0}',
        "panels": "[]",
    }
    alembic_runner.insert_into("results", results_data)

    alembic_runner.migrate_up_one()

    with alembic_engine.connect() as conn:
        result = conn.execute(
            text(
                f"SELECT concentrations FROM simulations WHERE id = '{simulations_id}'"
            )
        ).fetchone()
        assert result == (simulations_data["concentrations"],)

        model_input_id, *result = conn.execute(
            text(
                f"SELECT id, model_id, parameters FROM model_inputs WHERE simulation_id = '{simulations_id}'"
            )
        ).fetchone()
        assert result == [simulations_data["model_id"], simulations_data["parameters"]]

        result_id, *result = conn.execute(
            text(
                f"SELECT id, concentrations, panels FROM results WHERE model_input_id = '{model_input_id}'"
            )
        ).fetchone()
        assert result_id == UUID(int=2)
        assert result == [results_data["concentrations"], results_data["panels"]]

    alembic_runner.migrate_down_one()

    with alembic_engine.connect() as conn:
        result = conn.execute(
            text(
                f"SELECT {', '.join(simulations_data.keys())} FROM simulations WHERE id = '{simulations_id}'"
            )
        ).fetchone()
        assert result == tuple(simulations_data.values())

        result = conn.execute(
            text(
                f"SELECT {', '.join(results_data.keys())} FROM results WHERE id = '{UUID(int=2)}'"
            )
        ).fetchone()
        assert result == tuple(results_data.values())

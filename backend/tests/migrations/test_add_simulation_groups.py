import json
from datetime import datetime
from uuid import UUID

from sqlalchemy import text


def test_migration_backfills_group_membership_up_and_down(alembic_runner, alembic_engine):
    alembic_runner.migrate_up_before("5fba0c16b695")

    simulation_ids = [UUID(int=1), UUID(int=2), UUID(int=3)]
    for simulation_id in simulation_ids:
        alembic_runner.insert_into(
            "simulations",
            {
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "id": simulation_id,
                "owner_id": None,
                "phases": [],
                "conditions": {},
            },
        )

    grid_id = UUID(int=100)
    # Deliberately out of id order, to prove position is derived from array
    # order rather than re-sorted by id.
    ordered_ids = [simulation_ids[1], simulation_ids[0], simulation_ids[2]]
    grid_data = {
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "id": grid_id,
        "owner_id": None,
        "axes": [{"substance": "H2O", "range": {"min": 10, "max": 30, "step": 10}}],
        "simulation_ids": [str(sid) for sid in ordered_ids],
    }
    alembic_runner.insert_into("grid_simulations", grid_data)

    alembic_runner.migrate_up_one()

    with alembic_engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT id, group_id, group_position FROM simulations "
                "WHERE group_id = :grid_id ORDER BY group_position"
            ),
            {"grid_id": grid_id},
        ).fetchall()
        assert [row[0] for row in rows] == ordered_ids
        assert all(row[1] == grid_id for row in rows)
        assert [row[2] for row in rows] == [0, 1, 2]

    alembic_runner.migrate_down_one()

    with alembic_engine.connect() as conn:
        row = conn.execute(
            text("SELECT simulation_ids FROM grid_simulations WHERE id = :id"),
            {"id": grid_id},
        ).fetchone()
        assert row is not None
        stored = row[0]
        stored = json.loads(stored) if isinstance(stored, str) else stored
        restored_ids = [UUID(sid) for sid in stored]
        assert restored_ids == ordered_ids

        columns = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'simulations'"
            )
        ).fetchall()
        assert "group_id" not in {c[0] for c in columns}
        assert "group_position" not in {c[0] for c in columns}

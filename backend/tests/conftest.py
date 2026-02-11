from acidwatch_api.settings import SETTINGS
import pytest
from datetime import datetime
from uuid import UUID

from sqlalchemy import create_engine, text


@pytest.fixture(scope="session")
def set_acidwatch_env_to_test():
    from acidwatch_api.settings import SETTINGS

    SETTINGS.acidwatch_env = "test"


@pytest.fixture
def alembic_engine():
    database_url = SETTINGS.acidwatch_test_database
    if not database_url:
        pytest.skip(
            "Configure environment variable ACIDWATCH_TEST_DATABASE to point to a test postgresql database"
        )
    engine = create_engine(SETTINGS.acidwatch_test_database)

    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))

    return engine


@pytest.fixture
def alembic_config():
    return {
        "before_revision_data": {
            "01aaa143d690": [
                {
                    "__tablename__": "simulations",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now(),
                    "id": UUID(int=1000),
                    "owner_id": None,
                    "concentrations": '{"H2O": 2.0}',
                    "parameters": "{}",
                    "model_id": "dummy",
                },
                {
                    "__tablename__": "results",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now(),
                    "id": UUID(int=2000),
                    "simulation_id": UUID(int=1000),
                    "concentrations": '{"H2O": 2.0}',
                    "panels": "[]",
                },
            ]
        }
    }

import pytest


@pytest.fixture(scope="session")
def set_acidwatch_env_to_test():
    from acidwatch_api.settings import SETTINGS

    SETTINGS.acidwatch_env = "test"

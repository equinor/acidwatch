import pytest


@pytest.fixture(scope="session")
def set_acidwatch_env_to_test():
    from acidwatch_api.configuration import SETTINGS

    SETTINGS.acidwatch_env = "test"

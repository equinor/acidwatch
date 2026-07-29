from acidwatch_messaging import run_worker_from_environment

from .adapter import ExampleAdapter


run_worker_from_environment(ExampleAdapter)

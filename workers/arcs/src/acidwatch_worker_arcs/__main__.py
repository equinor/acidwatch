from acidwatch_worker_runtime import run_worker_from_environment

from .adapter import ArcsAdapter


run_worker_from_environment(ArcsAdapter)

from acidwatch_worker_runtime import run_worker_from_environment

from .adapter import ArcsExpAdapter


run_worker_from_environment(ArcsExpAdapter)

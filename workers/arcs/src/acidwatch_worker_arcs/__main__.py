from acidwatch_messaging import run_worker_from_environment

from .adapter import ArcsAdapter


run_worker_from_environment(ArcsAdapter)

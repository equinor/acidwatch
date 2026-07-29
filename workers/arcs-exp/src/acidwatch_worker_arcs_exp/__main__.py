from acidwatch_messaging import run_worker_from_environment

from .adapter import ArcsExpAdapter


run_worker_from_environment(ArcsExpAdapter)

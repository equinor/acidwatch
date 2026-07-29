from acidwatch_messaging import run_worker_from_environment

from .adapter import TocomoAdapter


run_worker_from_environment(TocomoAdapter)

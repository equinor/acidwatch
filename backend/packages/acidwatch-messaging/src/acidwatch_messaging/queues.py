HEARTBEATS_QUEUE = "acidwatch.heartbeats"
RESULTS_QUEUE = "acidwatch.results"
DEAD_LETTER_QUEUE = "acidwatch.results.dead"


def job_queue_name(model_id: str) -> str:
    return f"acidwatch.{model_id}"

import asyncio
import logging

import pytest

from acidwatch_api.broker.listener import restart_listener_on_failure


@pytest.mark.asyncio
async def test_listener_restarts_after_unexpected_failure(caplog):
    attempts = 0
    restarted = asyncio.Event()

    async def listener():
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("temporary failure")
        restarted.set()
        await asyncio.Event().wait()

    caplog.set_level(logging.ERROR)
    task = asyncio.create_task(
        restart_listener_on_failure("test-listener", listener, restart_delay=0)
    )
    try:
        await asyncio.wait_for(restarted.wait(), timeout=1)
        assert attempts == 2
        assert "test-listener stopped unexpectedly; restarting" in caplog.text
    finally:
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

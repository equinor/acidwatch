from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class Heartbeat:
    timestamp: datetime
    job_id: str | None


class HeartbeatRegistry:
    def __init__(self, timeout: timedelta = timedelta(seconds=60)):
        self._timeout = timeout
        self._heartbeats: dict[tuple[str, str], Heartbeat] = {}

    def update(
        self,
        model_id: str,
        *,
        instance_id: str,
        timestamp: datetime,
        job_id: str | None = None,
    ) -> None:
        key = (model_id, instance_id)
        current = self._heartbeats.get(key)
        if current is None or timestamp > current.timestamp:
            self._heartbeats[key] = Heartbeat(timestamp, job_id)

    def status(self, model_id: str, *, now: datetime) -> str:
        return (
            "warm"
            if any(
                heartbeat.timestamp + self._timeout > now
                for (known_model_id, _), heartbeat in self._heartbeats.items()
                if known_model_id == model_id
            )
            else "cold"
        )

    def all_statuses(self, *, now: datetime) -> dict[str, str]:
        return {
            model_id: self.status(model_id, now=now) for model_id, _ in self._heartbeats
        }

    def job_status(self, job_id: str, *, now: datetime) -> str:
        return (
            "processing"
            if any(
                heartbeat.job_id == job_id and heartbeat.timestamp + self._timeout > now
                for heartbeat in self._heartbeats.values()
            )
            else "unknown"
        )

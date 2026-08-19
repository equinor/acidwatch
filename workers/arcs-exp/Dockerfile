FROM python:3.13-slim AS build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY . /app
WORKDIR /app

ENV UV_NO_CACHE=1
ENV UV_PROJECT_ENVIRONMENT=/app/.venv

RUN apt-get update \
    && apt-get install --yes --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
RUN uv sync --project workers/arcs-exp --frozen --no-dev --no-editable

FROM python:3.13-slim

RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/.venv /app/.venv

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER 1000

ENTRYPOINT ["python", "-m", "acidwatch_worker_arcs_exp"]

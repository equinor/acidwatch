FROM python:3.13-slim AS build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY . /app
WORKDIR /app

ENV UV_NO_CACHE=1
ENV UV_PROJECT_ENVIRONMENT=/app/.venv

RUN uv sync --project workers/gibbs-minimization --frozen --no-dev --no-editable

FROM python:3.13-slim

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends openjdk-21-jre-headless && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/.venv /app/.venv

ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER 1000

ENTRYPOINT ["python", "-m", "acidwatch_worker_gibbs_minimization"]

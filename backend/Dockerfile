FROM python:3.13-slim AS build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY . /app
WORKDIR /app

ENV UV_NO_CACHE=1

RUN uv sync --package acidwatch-api --extra pg --frozen --no-dev --no-editable

FROM python:3.13-slim

RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/.venv /app/.venv
COPY backend/alembic /app/backend/alembic
COPY backend/alembic.ini backend/entrypoint /app/backend/
WORKDIR /app/backend

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER 1000

EXPOSE 8000

ENTRYPOINT ["/app/backend/entrypoint"]

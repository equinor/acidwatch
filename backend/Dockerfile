FROM docker.io/library/node:22-bookworm-slim AS frontend

WORKDIR /app/frontend
COPY frontend/package*.json frontend/.npmrc ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM python:3.13-alpine AS build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY . /app
WORKDIR /app

ENV UV_NO_CACHE=1

RUN uv sync --package acidwatch-api --extra pg --frozen --no-dev --no-editable

FROM python:3.13-alpine

COPY --from=build /app/.venv /app/.venv
COPY backend/alembic /app/backend/alembic
COPY backend/alembic.ini backend/entrypoint /app/backend/
COPY --from=frontend /app/frontend/dist /app/frontend
WORKDIR /app/backend

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FRONTEND_DIST=/app/frontend

USER 1000

EXPOSE 8000

ENTRYPOINT ["/app/backend/entrypoint"]

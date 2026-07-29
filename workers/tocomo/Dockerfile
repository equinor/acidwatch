FROM python:3.13-slim AS build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY . /app
WORKDIR /app

ENV UV_NO_CACHE=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
RUN uv sync --package acidwatch-worker-tocomo --frozen --no-dev --no-editable
RUN uv pip install \
    --python /app/.venv/bin/python \
    --no-deps \
    "git+https://github.com/equinor/tocomo@74e23131bd27d63dcf71b4a62eb81cdb76d981c9#subdirectory=backend"

FROM python:3.13-slim

COPY --from=build /app/.venv /app/.venv

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER 1000

ENTRYPOINT ["python", "-m", "acidwatch_worker_tocomo"]

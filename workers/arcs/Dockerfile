FROM python:3.13-slim AS build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY . /app
WORKDIR /app

ENV UV_NO_CACHE=1
ENV UV_PROJECT_ENVIRONMENT=/app/.venv

RUN apt-get update \
    && apt-get install --yes --no-install-recommends build-essential git git-lfs \
    && git lfs install --system \
    && rm -rf /var/lib/apt/lists/*

RUN git init /app/arcs-source \
    && git -C /app/arcs-source remote add origin https://github.com/equinor/arcs.git \
    && git -C /app/arcs-source fetch --depth 1 origin 21ded96960d28d549c0950fbc1aa09c94159f652 \
    && git -C /app/arcs-source checkout --detach FETCH_HEAD
RUN uv sync --project workers/arcs --frozen --no-dev --no-editable

FROM python:3.13-slim

COPY --from=build /app/.venv /app/.venv

# the bin and model folders are not included when installing arcs, so even though we added
# the arcs package in pyproject, we still need to copy these over. We could've fixed this
# in the pyproject for arcs, but since we are not going to move it forward anymore we keep it as is
COPY --from=build /app/arcs-source/bin /app/.venv/lib/python3.13/site-packages/bin
COPY --from=build --chown=1000:1000 /app/arcs-source/model /app/.venv/lib/python3.13/site-packages/model

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

USER 1000

ENTRYPOINT ["python", "-m", "acidwatch_worker_arcs"]

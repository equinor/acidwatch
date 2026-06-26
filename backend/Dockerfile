FROM python:3.13-slim
# Install OpenJDK 21 for Java support (needed by solubilityCCS)
RUN apt-get update && \
    apt-get install -y openjdk-21-jdk-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/default-java

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY .. /app
WORKDIR /app/backend

ENV UV_NO_CACHE=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN uv sync --package acidwatch-api --extra pg --frozen --no-dev --no-editable

USER 1000

EXPOSE 8001

ENTRYPOINT ["/app/backend/entrypoint"]

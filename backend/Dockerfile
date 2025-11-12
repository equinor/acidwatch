FROM python:3.11-slim
# Install OpenJDK 17 for Java support (needed by solubilityCCS)
RUN apt-get update && \
    apt-get install -y openjdk-21-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64/

ENV POETRY_CACHE_DIR=/var/cache/pypoetry

COPY . app
WORKDIR /app

RUN pip install poetry
RUN poetry install --with pg

USER 1001

EXPOSE 8001

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

CMD ["poetry", "run", "uvicorn", "acidwatch_api.app:app", "--host", "0.0.0.0", "--port", "8000"]

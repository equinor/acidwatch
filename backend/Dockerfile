FROM python:3.11-slim

ENV POETRY_CACHE_DIR '/var/cache/pypoetry'

COPY . app
WORKDIR /app

RUN pip install poetry
RUN poetry install

USER 1001

EXPOSE 8001

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

CMD ["poetry", "run", "uvicorn", "acidwatch_api.app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

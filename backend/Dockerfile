FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY entrypoint.sh ./entrypoint.sh
COPY app ./app

EXPOSE 5000

RUN chmod +x /app/entrypoint.sh

CMD ["sh", "/app/entrypoint.sh"]

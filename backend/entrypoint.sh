#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."

until python - <<'PY'
import os
import psycopg2

url = os.environ["DATABASE_URL"]
conn = psycopg2.connect(url)
conn.close()
PY
do
  echo "PostgreSQL not ready"
  sleep 2
done

echo "Running migrations..."
python -m flask db upgrade

echo "Seeding database..."
python -m app.seed

echo "Starting server..."
gunicorn backend.app.main:app --bind 0.0.0.0:10000
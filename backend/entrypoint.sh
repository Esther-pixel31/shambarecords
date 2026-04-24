#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."

until python - <<'PY'
import os
import psycopg2

conn = psycopg2.connect(os.environ["DATABASE_URL"])
conn.close()
PY
do
  echo "PostgreSQL not ready"
  sleep 2
done

echo "Running migrations..."
export FLASK_APP=app.main:create_app
python -m flask db upgrade

echo "Seeding database..."
python -m app.seed

echo "Starting server..."
gunicorn "app.main:create_app()" --bind 0.0.0.0:10000
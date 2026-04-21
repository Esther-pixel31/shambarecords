#!/bin/sh
set -e

until python - <<'PY'
import os
import psycopg2

url = os.environ["DATABASE_URL"]
connection = psycopg2.connect(url)
connection.close()
PY
do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

python -m app.seed
python -m flask --app app.main run --host=0.0.0.0 --port=5000

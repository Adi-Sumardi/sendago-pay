#!/bin/sh
# Each Go service owns its own logical database on this one shared Postgres instance
# (see docs/adr/002-single-postgres-instance.md) — created once here since
# golang-migrate runs migrations within a database but doesn't create one.
set -e

for db in identity merchant payment invoice notification settlement; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE $db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
done

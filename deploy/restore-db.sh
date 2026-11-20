#!/usr/bin/env sh
set -eu

# Restores a PostgreSQL backup into an isolated verification DB by default
# and reports backup freshness (RPO) and restore duration (RTO).
#
# Usage:
#   ./deploy/restore-db.sh <staging|production> <backup_file.dump> [verify_db_name]

ENV_NAME="${1:-}"
BACKUP_FILE="${2:-}"
VERIFY_DB="${3:-tanys_restore_verify}"

if [ "$ENV_NAME" != "staging" ] && [ "$ENV_NAME" != "production" ] || [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <staging|production> <backup_file.dump> [verify_db_name]" >&2
  exit 2
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [ -f "${BACKUP_FILE}.sha256" ]; then
  sha256sum -c "${BACKUP_FILE}.sha256"
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.$ENV_NAME"
COMPOSE_FILE="$SCRIPT_DIR/compose.deploy.yaml"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ "$VERIFY_DB" = "$POSTGRES_DB" ]; then
  echo "Refusing to overwrite live database $POSTGRES_DB without manual maintenance procedure." >&2
  exit 1
fi

NOW_TS="$(date +%s)"
FILE_MTIME="$(stat -c %Y "$BACKUP_FILE" 2>/dev/null || stat -f %m "$BACKUP_FILE")"
AGE_MINUTES="$(((NOW_TS - FILE_MTIME) / 60))"
START_TS="$(date +%s)"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$VERIFY_DB\";" \
  -c "CREATE DATABASE \"$VERIFY_DB\";"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$VERIFY_DB" --no-owner --no-privileges --exit-on-error < "$BACKUP_FILE"

MIGRATION_COUNT="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d "$VERIFY_DB" -tAc "SELECT count(*) FROM schema_migrations;" | tr -d '[:space:]')"

USERS_COUNT="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d "$VERIFY_DB" -tAc "SELECT count(*) FROM users;" | tr -d '[:space:]')"

EVENTS_COUNT="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d "$VERIFY_DB" -tAc "SELECT count(*) FROM events;" | tr -d '[:space:]')"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$VERIFY_DB\";"

END_TS="$(date +%s)"
RTO_SECONDS="$((END_TS - START_TS))"

echo "{\"event\":\"db_restore_verify_ok\",\"env\":\"$ENV_NAME\",\"backupAgeMinutes\":$AGE_MINUTES,\"rtoSeconds\":$RTO_SECONDS,\"migrations\":$MIGRATION_COUNT,\"users\":$USERS_COUNT,\"events\":$EVENTS_COUNT}"

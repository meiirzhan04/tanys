#!/usr/bin/env sh
set -eu

# Usage: ./deploy/backup-db.sh <staging|production> [backup_dir]

ENV_NAME="${1:-}"
BACKUP_DIR="${2:-/var/backups/tanys}"

if [ "$ENV_NAME" != "staging" ] && [ "$ENV_NAME" != "production" ]; then
  echo "Usage: $0 <staging|production> [backup_dir]" >&2
  exit 2
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.$ENV_NAME"
COMPOSE_FILE="$SCRIPT_DIR/compose.deploy.yaml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TARGET_DIR="$BACKUP_DIR/$ENV_NAME"
mkdir -p "$TARGET_DIR"
chmod 700 "$TARGET_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$TARGET_DIR/tanys_${ENV_NAME}_${STAMP}.dump"
START_TS="$(date +%s)"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges > "$OUT_FILE"

chmod 600 "$OUT_FILE"
sha256sum "$OUT_FILE" > "${OUT_FILE}.sha256"

# Enforce retention policy aligned with docs/data-processing-rules.md (<= 30 days)
find "$TARGET_DIR" -type f \( -name "*.dump" -o -name "*.sha256" \) -mtime "+$RETENTION_DAYS" -delete

END_TS="$(date +%s)"
DURATION="$((END_TS - START_TS))"
SIZE_BYTES="$(wc -c < "$OUT_FILE" | tr -d ' ')"

echo "{\"event\":\"db_backup_ok\",\"env\":\"$ENV_NAME\",\"file\":\"$(basename "$OUT_FILE")\",\"bytes\":$SIZE_BYTES,\"durationSec\":$DURATION,\"retentionDays\":$RETENTION_DAYS}"

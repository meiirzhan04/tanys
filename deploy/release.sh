#!/usr/bin/env sh
set -eu

# Usage:
#   ./deploy/release.sh deploy   <staging|production> <release_tag>
#   ./deploy/release.sh rollback <staging|production> [release_tag]

ACTION="${1:-}"
ENV_NAME="${2:-}"
TARGET_TAG="${3:-}"

if [ -z "$ACTION" ] || [ -z "$ENV_NAME" ]; then
  echo "Usage: $0 <deploy|rollback> <staging|production> [release_tag]" >&2
  exit 2
fi

if [ "$ENV_NAME" != "staging" ] && [ "$ENV_NAME" != "production" ]; then
  echo "APP_ENV must be staging or production (got: $ENV_NAME)" >&2
  exit 2
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.$ENV_NAME"
COMPOSE_FILE="$SCRIPT_DIR/compose.deploy.yaml"
STATE_FILE="$SCRIPT_DIR/.last_good_release.$ENV_NAME"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE (copy from .env.$ENV_NAME.example)" >&2
  exit 1
fi

if grep -q "REPLACE_WITH_" "$ENV_FILE"; then
  echo "Refusing release: $ENV_FILE still contains REPLACE_WITH_ placeholders" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ "$ACTION" = "rollback" ]; then
  if [ -z "$TARGET_TAG" ]; then
    if [ ! -f "$STATE_FILE" ]; then
      echo "No target tag provided and $STATE_FILE not found" >&2
      exit 1
    fi
    TARGET_TAG="$(cat "$STATE_FILE")"
  fi
fi

if [ -z "$TARGET_TAG" ]; then
  echo "Missing release_tag" >&2
  exit 2
fi

PREVIOUS_TAG="${RELEASE_TAG:-}"

apply_release() {
  TAG="$1"
  echo "[$ENV_NAME] Deploying release tag: $TAG"
  RELEASE_TAG="$TAG" docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
  RELEASE_TAG="$TAG" docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate
  RELEASE_TAG="$TAG" docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

  # Verify API readiness through HTTPS domain (or local container fallback)
  ATTEMPTS=0
  while [ "$ATTEMPTS" -lt 15 ]; do
    if RELEASE_TAG="$TAG" docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api \
      wget -qO- http://127.0.0.1:3000/ready | grep -q '"ready"'; then
      echo "[$ENV_NAME] Readiness PASS for tag $TAG"
      return 0
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 2
  done

  echo "[$ENV_NAME] Readiness FAILED for tag $TAG" >&2
  return 1
}

if apply_release "$TARGET_TAG"; then
  if [ "$ACTION" = "deploy" ] && [ -n "$PREVIOUS_TAG" ] && [ "$PREVIOUS_TAG" != "$TARGET_TAG" ]; then
    printf '%s\n' "$PREVIOUS_TAG" > "$STATE_FILE"
  fi
  echo "[$ENV_NAME] Release $TARGET_TAG active at https://$APP_DOMAIN"
  exit 0
fi

if [ "$ACTION" = "deploy" ] && [ -n "$PREVIOUS_TAG" ] && [ "$PREVIOUS_TAG" != "$TARGET_TAG" ]; then
  echo "[$ENV_NAME] Attempting automatic rollback to $PREVIOUS_TAG" >&2
  apply_release "$PREVIOUS_TAG"
fi

exit 1

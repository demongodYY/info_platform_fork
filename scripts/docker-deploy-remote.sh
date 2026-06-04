#!/usr/bin/env bash
# Runs on Lighthouse: expects CI-uploaded .output + Dockerfile from git pull.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/info_platform}"
CONTAINER_NAME="${CONTAINER_NAME:-info_platform}"
IMAGE_TAG="${IMAGE_TAG:-info_platform:latest}"
HOST_PORT="${HOST_PORT:-3000}"

cd "${APP_DIR}"

if [[ ! -f .env ]]; then
  echo "Missing ${APP_DIR}/.env — GitHub Actions must write it before deploy" >&2
  exit 1
fi

if [[ ! -d .output/server ]]; then
  echo "Missing ${APP_DIR}/.output — CI must upload the Nuxt build artifact first" >&2
  exit 1
fi

echo "Building runtime Docker image (prebuilt .output)..."
export DOCKER_BUILDKIT=1
docker build --progress=plain -t "${IMAGE_TAG}" .

echo "Restarting container..."
docker stop "${CONTAINER_NAME}" 2>/dev/null || true
docker rm "${CONTAINER_NAME}" 2>/dev/null || true

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --env-file .env \
  -p "127.0.0.1:${HOST_PORT}:3000" \
  "${IMAGE_TAG}"

echo "Container ${CONTAINER_NAME} listening on 127.0.0.1:${HOST_PORT} (map 443 via host Nginx/Caddy)"

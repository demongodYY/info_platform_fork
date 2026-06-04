#!/usr/bin/env bash
# App container only. TLS / 443: separate nginx-ssl container on the host.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/info_platform}"
CONTAINER_NAME="${CONTAINER_NAME:-info_platform}"
IMAGE_TAG="${IMAGE_TAG:-info_platform:latest}"
APP_PORT="${APP_PORT:-3000}"
# Optional: same Docker network as nginx-ssl (e.g. proxy_pass http://10.1.0.10:3000)
DOCKER_NETWORK="${DOCKER_NETWORK:-}"
APP_CONTAINER_IP="${APP_CONTAINER_IP:-}"
NGINX_SSL_CONTAINER="${NGINX_SSL_CONTAINER:-nginx-ssl}"

cd "${APP_DIR}"

if [[ ! -f .env ]]; then
  echo "Missing ${APP_DIR}/.env" >&2
  exit 1
fi

if [[ ! -d .output/server ]]; then
  echo "Missing ${APP_DIR}/.output — run CI deploy first" >&2
  exit 1
fi

echo "Building app image (prebuilt .output)..."
export DOCKER_BUILDKIT=1
docker build --progress=plain -t "${IMAGE_TAG}" .

echo "Restarting app container..."
docker stop "${CONTAINER_NAME}" 2>/dev/null || true
docker rm "${CONTAINER_NAME}" 2>/dev/null || true

RUN_OPTS=(
  -d
  --name "${CONTAINER_NAME}"
  --restart unless-stopped
  --env-file .env
  -p "0.0.0.0:${APP_PORT}:3000"
)

if [[ -n "${DOCKER_NETWORK}" ]]; then
  RUN_OPTS+=(--network "${DOCKER_NETWORK}")
  if [[ -n "${APP_CONTAINER_IP}" ]]; then
    RUN_OPTS+=(--ip "${APP_CONTAINER_IP}")
  fi
fi

docker run "${RUN_OPTS[@]}" "${IMAGE_TAG}"

if docker ps -a --format '{{.Names}}' | grep -qx "${NGINX_SSL_CONTAINER}"; then
  echo "Restarting ${NGINX_SSL_CONTAINER}..."
  docker restart "${NGINX_SSL_CONTAINER}"
fi

echo "App listening on 0.0.0.0:${APP_PORT} (nginx-ssl terminates HTTPS)"

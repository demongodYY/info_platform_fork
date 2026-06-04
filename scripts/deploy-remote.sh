#!/usr/bin/env bash
set -euo pipefail

: "${RELEASE_ID:?RELEASE_ID is required}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required}"

RELEASE_DIR="${DEPLOY_PATH}/releases/${RELEASE_ID}"
CURRENT_LINK="${DEPLOY_PATH}/current"
ENV_FILE="${DEPLOY_PATH}/.env"
RUNTIME_ENV="${RELEASE_DIR}/.env.runtime"
ECOSYSTEM_SRC="${RELEASE_DIR}/ecosystem.config.cjs"
ECOSYSTEM_DEST="${DEPLOY_PATH}/ecosystem.config.cjs"

if [[ ! -d "${RELEASE_DIR}/.output" ]]; then
  echo "Missing .output in ${RELEASE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${RUNTIME_ENV}" ]]; then
  echo "Missing ${RUNTIME_ENV} (GitHub Actions should generate .env.runtime)" >&2
  exit 1
fi

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
cp -f "${RUNTIME_ENV}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

if [[ -f "${ECOSYSTEM_SRC}" ]]; then
  cp -f "${ECOSYSTEM_SRC}" "${ECOSYSTEM_DEST}"
fi

export DEPLOY_PATH
cd "${DEPLOY_PATH}"

if pm2 describe info-platform >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save
echo "Deployed release ${RELEASE_ID} -> ${CURRENT_LINK}"

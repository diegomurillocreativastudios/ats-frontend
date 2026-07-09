#!/usr/bin/env bash
# Deploy ATS frontend to Google Cloud Run via Cloud Build + Artifact Registry.
#
# Usage:
#   ./scripts/deploy-gcp.sh staging
#   ./scripts/deploy-gcp.sh production
#
# Optional env overrides:
#   GCP_PROJECT_ID, GCP_REGION, AR_REPO, IMAGE_NAME
#   NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL
#   API_URL, BACKEND_URL
#   NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL, NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL

set -euo pipefail

ENV_NAME="${1:-}"
if [[ -z "${ENV_NAME}" ]]; then
  echo "Usage: $0 <staging|production>" >&2
  exit 1
fi

case "${ENV_NAME}" in
  staging|production) ;;
  *)
    echo "Environment must be 'staging' or 'production' (got: ${ENV_NAME})" >&2
    exit 1
    ;;
esac

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

REGION="${GCP_REGION:-us-west2}"
REPO="${AR_REPO:-ats-frontend}"
IMAGE_NAME="${IMAGE_NAME:-ats-frontend}"
SERVICE="ats-frontend-${ENV_NAME}"

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" >&2
  echo "Or export GCP_PROJECT_ID=YOUR_PROJECT_ID" >&2
  exit 1
fi

if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "NEXT_PUBLIC_API_URL is required (backend URL, no trailing slash)." >&2
  echo "Example: export NEXT_PUBLIC_API_URL=https://api.example.com" >&2
  exit 1
fi

if [[ -z "${NEXT_PUBLIC_APP_URL:-}" ]]; then
  echo "Warning: NEXT_PUBLIC_APP_URL is empty. Set it to the Cloud Run public URL after first deploy, then redeploy." >&2
fi

# Image tag: git short SHA, or timestamp fallback for dirty/local trees.
IMAGE_TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"

# Server-side backend URL defaults to the public API URL when not set.
API_URL_VALUE="${API_URL:-${NEXT_PUBLIC_API_URL}}"
BACKEND_URL_VALUE="${BACKEND_URL:-}"

echo "==> Project:  ${PROJECT_ID}"
echo "==> Region:   ${REGION}"
echo "==> Service:  ${SERVICE}"
echo "==> Tag:      ${IMAGE_TAG}"
echo "==> Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}"
echo "==> API URL:  ${NEXT_PUBLIC_API_URL}"
echo "==> App URL:  ${NEXT_PUBLIC_APP_URL:-"(empty)"}"
echo

# Ensure Artifact Registry Docker repo exists (idempotent).
if ! gcloud artifacts repositories describe "${REPO}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repository '${REPO}' in ${REGION}..."
  gcloud artifacts repositories create "${REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="ATS frontend Docker images" \
    --project="${PROJECT_ID}"
fi

SUBSTITUTIONS="_REGION=${REGION}"
SUBSTITUTIONS+=",_REPO=${REPO}"
SUBSTITUTIONS+=",_SERVICE=${SERVICE}"
SUBSTITUTIONS+=",_IMAGE=${IMAGE_NAME}"
SUBSTITUTIONS+=",_TAG=${IMAGE_TAG}"
SUBSTITUTIONS+=",_NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
SUBSTITUTIONS+=",_NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-}"
SUBSTITUTIONS+=",_NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL=${NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL:-}"
SUBSTITUTIONS+=",_NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL=${NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL:-}"
SUBSTITUTIONS+=",_API_URL=${API_URL_VALUE}"
SUBSTITUTIONS+=",_BACKEND_URL=${BACKEND_URL_VALUE}"

echo "==> Submitting Cloud Build..."
gcloud builds submit \
  --project="${PROJECT_ID}" \
  --config=cloudbuild.yaml \
  --substitutions="${SUBSTITUTIONS}" \
  .

echo
echo "==> Deploy finished."
echo "Service URL:"
gcloud run services describe "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)'

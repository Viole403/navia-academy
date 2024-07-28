#!/usr/bin/env bash
# Setup GitHub Actions secrets untuk Media Studio pipeline.
#
# Usage:
#   1) export dulu nilai-nilainya (bisa `set -a; source .env.local; set +a`), lalu:
#      ./scripts/setup-gh-secrets.sh <owner/repo>
#      Contoh: ./scripts/setup-gh-secrets.sh navia/navia-academy
#
# Secret yang dibutuhkan workflow: .github/workflows/media-generate.yml

set -euo pipefail

REPO="${1:-}"
if [ -z "$REPO" ]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi
if [ -z "$REPO" ]; then
  echo "Gagal deteksi repo. Usage: $0 <owner/repo>"
  exit 1
fi
echo "Setting secrets → $REPO"
echo "Hints: export MEDIA_STORAGE_ACCESS_KEY=... dst, atau: set -a; source apps/media/.env.local; set +a"

set_secret() {
  local name="$1"
  local val="${!name:-}"
  if [ -n "$val" ]; then
    gh secret set "$name" --repo "$REPO" --body "$val"
    echo "  ✓ $name"
  else
    echo "  · $name (kosong — di-skip)"
  fi
}

echo "── Storage (R2 / GCS / AWS S3 / MinIO) ──"
set_secret MEDIA_STORAGE_PROVIDER
set_secret MEDIA_STORAGE_BUCKET
set_secret MEDIA_STORAGE_REGION
set_secret MEDIA_STORAGE_ENDPOINT
set_secret MEDIA_STORAGE_ACCESS_KEY
set_secret MEDIA_STORAGE_SECRET_KEY
set_secret MEDIA_STORAGE_PUBLIC_URL

echo "── TTS (edge default; opsional google/azure) ──"
set_secret MEDIA_TTS_ENGINE
set_secret GOOGLE_TTS_API_KEY
set_secret AZURE_SPEECH_KEY
set_secret AZURE_SPEECH_REGION

echo "── Image generation ──"
set_secret MEDIA_IMAGE_PROVIDER
set_secret MEDIA_IMAGE_API_KEY
set_secret MEDIA_IMAGE_API_BASE_URL
set_secret MEDIA_IMAGE_MODEL

echo "── Supabase (content + key pool via service-role) ──"
set_secret CONTENT_SUPABASE_URL
set_secret CONTENT_SUPABASE_SERVICE_ROLE_KEY
set_secret MEDIA_IMAGE_KEY_COOLDOWN_MS
set_secret MEDIA_TTS_KEY_COOLDOWN_MS
set_secret MEDIA_ADMIN_TOKEN

echo "Selesai. Jalankan workflow: gh workflow run media-generate.yml -f scope=all -f upload=yes"

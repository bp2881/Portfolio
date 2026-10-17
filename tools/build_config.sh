#!/usr/bin/env bash
# Generates assets/js/config.js from environment variables.
# Run by Appwrite Sites as the build command: bash tools/build_config.sh
# For local development, copy config.example.js to config.js instead.

set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DIR/assets/js/config.js"

cat > "$OUT" <<EOF
window.__CONFIG__ = {
  endpoint: "${APPWRITE_ENDPOINT:-}",
  projectId: "${APPWRITE_PROJECT_ID:-}",
  bucketId: "${APPWRITE_BUCKET_ID:-portfolio}",
  snapshotFileId: "${APPWRITE_SNAPSHOT_FILE_ID:-snapshot}",
  databaseId: "${APPWRITE_DATABASE_ID:-}",
  visitsCollectionId: "${APPWRITE_VISITS_COLLECTION_ID:-}"
};
EOF

echo "Wrote $OUT"

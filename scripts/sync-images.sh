#!/bin/bash
# Скачивает изображения мероприятий и обновляет пути в БД
# Запуск: /opt/afisha/scripts/sync-images.sh
# Cron: 0 9 * * * /opt/afisha/scripts/sync-images.sh >> /var/log/afisha-images.log 2>&1

set -e
IMAGES_DIR="/opt/afisha/images"
SITE_URL="${SITE_URL:-https://kudaafisha.ru}"
DB_CONTAINER="afisha-postgres-1"
MAX_DOWNLOAD=500  # per run, to avoid overloading
CONCURRENT=5

mkdir -p "$IMAGES_DIR"

echo "$(date) === Starting image sync ==="

# Get events with remote imageUrl (not yet downloaded)
EVENTS=$(docker exec "$DB_CONTAINER" psql -U afisha -d afisha -t -A -c "
  SELECT id, \"imageUrl\"
  FROM \"Event\"
  WHERE \"isActive\" = true
    AND \"imageUrl\" IS NOT NULL
    AND \"imageUrl\" LIKE 'http%'
    AND \"imageUrl\" NOT LIKE '${SITE_URL}%'
  ORDER BY date ASC
  LIMIT $MAX_DOWNLOAD
")

COUNT=0
FAILED=0
SKIPPED=0

download_image() {
  local ID="$1"
  local URL="$2"
  local EXT="${URL##*.}"

  # Normalize extension
  case "$EXT" in
    jpg|jpeg|png|webp) ;;
    *) EXT="jpg" ;;
  esac

  local FILENAME="${ID}.${EXT}"
  local FILEPATH="${IMAGES_DIR}/${FILENAME}"

  # Skip if already downloaded
  if [ -f "$FILEPATH" ]; then
    return 0
  fi

  # Download
  if curl -sL --max-time 10 -o "$FILEPATH" "$URL" 2>/dev/null; then
    # Verify it's actually an image (at least 1KB)
    local SIZE=$(stat -c%s "$FILEPATH" 2>/dev/null || echo "0")
    if [ "$SIZE" -lt 1024 ]; then
      rm -f "$FILEPATH"
      return 1
    fi

    # Update DB with local path
    local LOCAL_URL="${SITE_URL}/api/images/${FILENAME}"
    docker exec "$DB_CONTAINER" psql -U afisha -d afisha -c \
      "UPDATE \"Event\" SET \"imageUrl\" = '${LOCAL_URL}' WHERE id = ${ID}" > /dev/null 2>&1
    return 0
  else
    rm -f "$FILEPATH"
    return 1
  fi
}

while IFS='|' read -r ID URL; do
  [ -z "$ID" ] && continue
  ID=$(echo "$ID" | tr -d ' ')
  URL=$(echo "$URL" | tr -d ' ')

  if download_image "$ID" "$URL"; then
    COUNT=$((COUNT + 1))
  else
    FAILED=$((FAILED + 1))
  fi

  # Progress
  TOTAL=$((COUNT + FAILED))
  if [ $((TOTAL % 50)) -eq 0 ] && [ $TOTAL -gt 0 ]; then
    echo "$(date) - Progress: $COUNT downloaded, $FAILED failed"
  fi
done <<< "$EVENTS"

echo "$(date) === Image sync complete: $COUNT downloaded, $FAILED failed ==="
echo "$(date) - Disk usage: $(du -sh $IMAGES_DIR | cut -f1)"

#!/bin/bash
# Удаляет изображения прошедших мероприятий
# Запуск: /opt/afisha/scripts/cleanup-images.sh
# Cron: 0 4 * * * /opt/afisha/scripts/cleanup-images.sh >> /var/log/afisha-images.log 2>&1

set -e
IMAGES_DIR="/opt/afisha/images"
DB_CONTAINER="afisha-postgres-1"

echo "$(date) === Starting image cleanup ==="

BEFORE=$(du -sh "$IMAGES_DIR" 2>/dev/null | cut -f1 || echo "0")

# Get IDs of expired/inactive events that have local images
EXPIRED_IDS=$(docker exec "$DB_CONTAINER" psql -U afisha -d afisha -t -A -c "
  SELECT id FROM \"Event\"
  WHERE (date < NOW() - INTERVAL '7 days' OR \"isActive\" = false)
    AND \"imageUrl\" LIKE '%/api/images/%'
")

COUNT=0
for ID in $EXPIRED_IDS; do
  ID=$(echo "$ID" | tr -d ' ')
  [ -z "$ID" ] && continue

  # Remove all possible extensions
  rm -f "${IMAGES_DIR}/${ID}.jpg" "${IMAGES_DIR}/${ID}.jpeg" "${IMAGES_DIR}/${ID}.png" "${IMAGES_DIR}/${ID}.webp"

  # Reset imageUrl to NULL (original URL lost, event expired anyway)
  docker exec "$DB_CONTAINER" psql -U afisha -d afisha -c \
    "UPDATE \"Event\" SET \"imageUrl\" = NULL WHERE id = ${ID}" > /dev/null 2>&1

  COUNT=$((COUNT + 1))
done

AFTER=$(du -sh "$IMAGES_DIR" 2>/dev/null | cut -f1 || echo "0")

echo "$(date) === Cleanup complete: $COUNT images removed ==="
echo "$(date) - Disk: $BEFORE -> $AFTER"

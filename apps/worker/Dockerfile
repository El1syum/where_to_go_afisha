FROM node:20-alpine
WORKDIR /app

# ImageMagick for on-the-fly resize + webp conversion in the Telegram poster
# (same pipeline as scripts/sync-images.sh).
RUN apk add --no-cache imagemagick

COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
RUN npm ci --workspace=apps/worker --workspace=packages/db

COPY packages/db/prisma ./packages/db/prisma
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

COPY packages/db ./packages/db
COPY apps/worker ./apps/worker

CMD ["npx", "tsx", "apps/worker/src/index.ts"]

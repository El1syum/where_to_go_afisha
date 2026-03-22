FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
RUN npm ci --workspace=apps/worker --workspace=packages/db

COPY packages/db/prisma ./packages/db/prisma
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

COPY packages/db ./packages/db
COPY apps/worker ./apps/worker

CMD ["npx", "tsx", "apps/worker/src/index.ts"]

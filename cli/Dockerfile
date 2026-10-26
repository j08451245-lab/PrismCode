FROM oven/bun:1.2 AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json bun.lock ./
COPY packages/database/package.json ./packages/database/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile --production

# ---- Build ----
FROM base AS build
COPY package.json bun.lock ./
COPY packages/database/ ./packages/database/
COPY packages/server/ ./packages/server/
COPY packages/shared/ ./packages/shared/
RUN bun install --frozen-lockfile

# Generate Prisma client for PostgreSQL
COPY packages/database/prisma/schema.postgres.prisma ./packages/database/prisma/schema.prisma
RUN cd packages/database && bunx prisma generate

# Build server bundle
RUN cd packages/server && bun build ./src/index.ts --outdir ./dist --target bun --packages external

# ---- Production ----
FROM oven/bun:1.2-slim AS production
WORKDIR /app

# Install runtime deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/database/generated ./packages/database/generated
COPY --from=build /app/packages/shared ./packages/shared

# Bundle env: these MUST be set at runtime
ENV NODE_ENV=production
ENV API_URL=http://localhost:3001
ENV PORT=3001

EXPOSE 3001

CMD ["bun", "run", "./packages/server/dist/index.js"]

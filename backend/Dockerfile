# ─── Build Stage ───
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy package.json files for all workspaces
COPY backend/package.json backend/
COPY database/package.json database/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/fhir-parser/package.json packages/fhir-parser/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY backend/ backend/
COPY database/ database/
COPY packages/ packages/

# Generate Prisma client (use backend's prisma CLI, schema is in database/)
RUN cd backend && npx prisma generate --schema=../database/prisma/schema.prisma

# Build shared packages first
RUN pnpm --filter @medconnect/shared-types build
RUN pnpm --filter @medconnect/fhir-parser build

# Build NestJS backend
RUN cd backend && npx nest build

# Create a self-contained deployment package with pnpm deploy
# --legacy flag needed for pnpm v10 to deploy from workspace packages
RUN pnpm deploy --filter @medconnect/api --prod --legacy /app/deploy

# Copy the built NestJS output (pnpm deploy doesn't include build artifacts)
# Use trailing /. to copy contents, not the directory itself
# This ensures main.js is at /app/deploy/dist/main.js (not /app/deploy/dist/src/main.js)
RUN cp -r /app/backend/dist/src/. /app/deploy/dist/ && \
    # Copy generated Prisma client (prisma generate ran after install, so deploy misses it)
    cp -r /app/backend/node_modules/.prisma /app/deploy/node_modules/.prisma && \
    # Copy Prisma schema for reference (optional, generated client is self-contained)
    mkdir -p /app/deploy/database/prisma && \
    cp /app/database/prisma/schema.prisma /app/deploy/database/prisma/

# ─── Production Stage ───
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache tini

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy the entire deployment package (includes flat node_modules)
COPY --from=builder /app/deploy .

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]

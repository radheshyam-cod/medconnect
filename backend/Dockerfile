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
RUN pnpm --filter @medconnect/shared-types build 2>/dev/null || true
RUN pnpm --filter @medconnect/fhir-parser build 2>/dev/null || true

# Build NestJS backend
RUN cd backend && npx nest build

# ─── Production Stage ───
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache tini

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy Prisma schema (for reference) and generated client from builder
COPY --from=builder /app/database/prisma ./database/prisma
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma

# Copy built backend artifacts
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

# Copy shared package artifacts needed at runtime
COPY --from=builder /app/packages/shared-types/dist ./node_modules/@medconnect/shared-types/dist
COPY --from=builder /app/packages/fhir-parser/dist ./node_modules/@medconnect/fhir-parser/dist

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]

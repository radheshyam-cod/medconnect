# Keploy Integration Guide

> Automated API testing via traffic recording for MedConnect India.

## Quickstart

```bash
# 1. Install Keploy CLI
pnpm keploy:init

# 2. Start dependencies and record API traffic
docker compose -f backend/docker-compose.yml up -d db cache
pnpm keploy:record

# 3. In another terminal, make requests to http://localhost:3001/api/v1/...
#    (use your frontend, curl, or Postman)

# 4. Press Ctrl+C to stop recording, then replay tests
pnpm keploy:test
```

## Overview

Keploy records real API traffic hitting your NestJS backend and converts it into reusable test cases with automatic mocks for external dependencies (PostgreSQL, Redis, Gemini, Supabase, Clerk). Record once, replay forever — every PR gets a regression check.

> **Why Keploy?** Manual API test writing is slow and brittle. Keploy auto-generates tests from real traffic, detects regressions on every PR, and mocks external services so you don't need real credentials in CI.

## Prerequisites

| Tool     | Version | Check                    |
| -------- | ------- | ------------------------ |
| Node.js  | >= 20   | `node --version`         |
| pnpm     | >= 9    | `pnpm --version`         |
| Docker   | latest  | `docker --version`       |
| Keploy   | latest  | `keploy --version`       |

## Installation

```bash
# Install Keploy CLI
pnpm keploy:init

# Verify
keploy --version

# Install project dependencies
pnpm install

# Generate Prisma client
pnpm db:migrate

# Build the backend
pnpm build
```

## Recording Tests

Start your app and its dependencies, then interact with the APIs.

### Option A: Native (Linux with eBPF)

```bash
# Start PostgreSQL and Redis
docker compose -f backend/docker-compose.yml up -d db cache

# Build and start the API under Keploy recording
pnpm keploy:record

# In another terminal, make API requests (curl, Postman, frontend)
curl -X POST http://localhost:3001/api/v1/documents/upload \
  -H "Authorization: Bearer <your-clerk-token>" \
  -F "file=@test/fixtures/prescription.pdf"

# Press Ctrl+C to stop recording when done
```

### Option B: Docker (macOS / Windows)

```bash
# Start all services + Keploy recording
pnpm docker:keploy:record

# Make API requests to http://localhost:3001/api/v1/...
# Press Ctrl+C to stop recording
```

### What Gets Recorded

Keploy captures:
- HTTP requests/responses (headers, body, status codes)
- PostgreSQL queries (automatically mocked during replay)
- Redis commands (BullMQ traffic)
- External API calls (Gemini, Supabase, Clerk, Document AI)

### What Gets Ignored

The `keploy.yml` configuration automatically ignores:
- **Endpoints**: `/health`, `/docs`, `/swagger`, `/metrics`, `/webhooks`
- **Headers**: `Date`, `Authorization`, `Set-Cookie`, server-specific headers
- **Body fields**: All timestamps (`createdAt`, `updatedAt`), auto-generated IDs, pagination metadata, confidence scores
- **Sensitive data**: JWT tokens, API keys, medical PII/PHI (see [Privacy](#privacy) section)

## Running Tests

After recording test suites, replay them to verify no regressions:

```bash
# Start dependencies
docker compose -f backend/docker-compose.yml up -d db cache

# Run all recorded test suites
pnpm keploy:test

# Or with Docker
pnpm docker:keploy:test
```

### Test Output

```
Keploy Test Results:
  ✅ test-set-0: PASS (3 assertions)
  ✅ test-set-1: PASS (5 assertions)
  ❌ test-set-2: FAIL - response body mismatch
```

If a test fails, Keploy shows a diff of what changed.

## Updating Test Snapshots

When you intentionally change an API response (e.g., adding a new field), update the recorded snapshots:

```bash
pnpm keploy:update
```

This replays the recorded requests and replaces the expected responses with the current ones.

## Running All Tests

```bash
# Jest unit tests + coverage + Keploy regression tests
pnpm test:all

# Individual commands
pnpm test              # Jest unit tests
pnpm test:coverage     # Jest with coverage
pnpm test:regression   # Keploy regression
pnpm test:e2e          # Jest e2e tests
pnpm keploy:clean      # Remove all recorded tests
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/keploy-ci.yml`) runs on every push to `main`/`develop` and every PR:

1. **Quality Checks**: lint, typecheck, build (backend only — frontend CI is separate)
2. **Jest Tests**: unit tests with coverage
3. **Keploy Regression**: replays recorded test suites
4. **Artifacts**: coverage reports + Keploy results uploaded

The pipeline fails if any Keploy test detects a regression.

> **Note**: The CI pipeline only runs backend checks (`--filter @medconnect/api`) since Keploy tests the API layer. Frontend checks run in a separate workflow.

## Mocking External Services

Keploy auto-mocks these dependencies during replay:

| Service           | Port | How It's Mocked                |
| ----------------- | ---- | ------------------------------ |
| PostgreSQL        | 5432 | TCP proxy: returns recorded SQL responses |
| Redis / BullMQ    | 6379 | TCP proxy: returns recorded command output |
| Gemini API        | 443  | HTTPS proxy: returns recorded AI responses |
| Supabase Storage  | 443  | HTTPS proxy: returns recorded storage calls |
| Clerk Auth        | 443  | HTTPS proxy: returns recorded token verification |
| Google Doc AI     | 443  | HTTPS proxy: returns recorded OCR results |

Configured in `keploy.yml` under `mock.services`.

## Privacy & Security

### Automatic PII/PHI Masking

The Keploy configuration automatically sanitizes recorded data:

- **Patient identifiers**: IDs, names, phone numbers, emails, ABHA IDs
- **Medical identifiers**: document IDs, medication IDs, doctor names, hospital IDs
- **Authentication**: JWT tokens, Clerk secret keys, API keys
- **Timestamps**: All `createdAt`, `updatedAt`, date fields (dynamic across runs)
- **Confidence scores**: OCR confidence, AI confidence, feedback scores

These are defined in `keploy.yml` under `global.ignoredFields.body`.

### Never Stored in Recordings

- JWT secrets
- Clerk secret keys (`CLERK_SECRET_KEY`)
- Database credentials (`DATABASE_URL`)
- Supabase service keys (`SUPABASE_SERVICE_KEY`)
- Gemini API keys (`GEMINI_API_KEY`)
- Google Document AI credentials

All sensitive environment variables are replaced with placeholders in `docker-compose.yml`.

## Common Tasks

### Add a new API endpoint

1. Implement the endpoint in NestJS (controller + service)
2. Start recording: `pnpm keploy:record`
3. Make requests to the new endpoint
4. Stop recording; test cases are saved
5. Verify: `pnpm keploy:test`

### Ignore a new endpoint

Add the path to `keploy.yml` under `global.denylist`:

```yaml
global:
  denylist:
    - path: /api/v1/new-noisy-endpoint
```

### Ignore a new dynamic field

Add a regex pattern to `keploy.yml` under `global.ignoredFields.body`:

```yaml
global:
  ignoredFields:
    body:
      - ".*newDynamicField"
```

### Debug a failing test

1. Run the failing test suite in verbose mode: `keploy test -c "node backend/dist/main" --delay 10 --debug`
2. Check the Keploy diff output — it shows exactly which field(s) changed
3. If the change is intentional, update the snapshot: `pnpm keploy:update`
4. If the field is dynamic (timestamp, ID), add it to `keploy.yml` `ignoredFields`

## Files Reference

| File | Purpose |
| ---- | ------- |
| `keploy.yml` | Keploy configuration (ignore rules, mock services, paths) |
| `backend/docker-compose.yml` | Local dev stack (PostgreSQL, Redis, API) |
| `backend/Dockerfile` | Production container image |
| `.github/workflows/keploy-ci.yml` | CI pipeline with Keploy regression |
| `scripts/keploy-setup.sh` | All-in-one setup/record/test/clean script |
| `.keploy/` | Recorded test suites and mocks (gitignored) |

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| `keploy: command not found` | Run `pnpm keploy:init` to install the CLI |
| `eBPF not supported` | Use Docker mode: `pnpm docker:keploy:record` |
| Database connection refused | Start deps: `docker compose -f backend/docker-compose.yml up -d db cache` |
| No test suites found | Record traffic first: `pnpm keploy:record`, then make API requests |
| Test fails on timestamps | Add the field to `keploy.yml` `global.ignoredFields.body` |
| Test fails on auth | Clerk JWTs are dynamic; ensure `Authorization` header is in `ignoredFields` |
| Test fails on IDs | Database IDs change per run; ensure `.*\\.id` patterns are in `ignoredFields` |

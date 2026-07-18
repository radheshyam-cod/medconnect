<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./frontend/public/logo.png">
    <img alt="MedConnect India Logo" src="./frontend/public/logo.png" width="80" height="80">
  </picture>
  <h1 align="center">MedConnect India</h1>
  <p align="center">
    AI-Powered Personal Health Record (PHR) Platform for India
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#deployment">Deployment</a> •
    <a href="#api-documentation">API Docs</a>
  </p>
</div>

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.1-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.3-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/medconnect/medconnect-india/actions/workflows/keploy-ci.yml/badge.svg)](https://github.com/medconnect/medconnect-india/actions/workflows/keploy-ci.yml)

</div>

---

## Overview

**MedConnect India** is an open-source, AI-powered Personal Health Record (PHR) platform purpose-built for the Indian healthcare ecosystem. It allows individuals to securely aggregate, understand, and share their medical records — from prescriptions and lab reports to discharge summaries and imaging — using state-of-the-art AI and a privacy-first architecture.

The platform addresses a critical gap in Indian healthcare: **fragmented, paper-based medical records**. Patients see multiple doctors, maintain physical files, and have no unified view of their health history. MedConnect solves this by automatically extracting structured medical data from uploaded documents, building a comprehensive health timeline, generating AI-powered summaries, and enabling secure sharing with family and healthcare providers.

### Why MedConnect?

- **India-First Design:** Built for the Indian context — supports Indian medication names, local hospital formats, ABHA/ABDM integration, and languages including Hindi.
- **Zero Manual Data Entry:** Upload a photo of your prescription or lab report; the AI does the rest.
- **Privacy by Default:** You control what's shared and with whom. Family sharing, secure link sharing, and granular permission controls.
- **AI That Understands Healthcare:** Google Gemini multi-model OCR extraction, Mem0 contextual memory, voice interface in English and Hindi.

---

## Features

<details open>
<summary><strong>📄 AI-Powered Document Processing</strong></summary>

- **Multi-engine OCR:** Google Document AI (production) with automatic Gemini fallback
- **Structured Extraction:** Automatically extracts diseases, medicines, doctors, hospitals, lab values, dates, and procedures from messy OCR text
- **Auto-create Records:** Extracted medicines create tracking records; lab values populate your lab results dashboard
- **Supported Formats:** PDF, JPEG, PNG, WebP, TIFF (up to 20 MB per file)
- **Document Types:** Prescriptions, Lab Reports, Discharge Summaries, Imaging Reports, Vaccination Cards, Health Cards, Insurance
</details>

<details>
<summary><strong>📊 Smart Health Dashboard</strong></summary>

- **Health Score:** Calculated dynamically from timeline events, medication adherence, and lab results
- **AI Timeline Insights:** Narrative summary of your last month's health events with key events, trends, and recommendations
- **Real-time Stats:** Active medications, documents this month, lab results, reminders
- **Patient Profile Quick Look:** Age, gender, blood group, allergies at a glance
- **Emergency Card:** Quick-access emergency medical information
</details>

<details>
<summary><strong>⏱️ Health Timeline</strong></summary>

- **Chronological Journey:** Automatically built timeline from uploaded documents and manual entries
- **Event Types:** Visits, diagnoses, medications, lab tests, procedures, imaging, vaccinations, allergies, hospitalizations, surgeries
- **AI Fire-and-Forget Generation:** Generate timeline events from document extractions in one click
- **Filtering & Sorting:** Filter by event type, sort by date, paginated view
</details>

<details>
<summary><strong>💊 Medication Tracking</strong></summary>

- **Auto-populated from Documents:** Medicines extracted from prescriptions auto-create medication records
- **Active/Inactive Status:** Track current and past medications
- **Dosage & Frequency:** Structured dosage, frequency, and route information
- **Reminders:** Configurable medication reminders (time-based, days of week)
</details>

<details>
<summary><strong>🔬 Lab Results</strong></summary>

- **Trending:** Track lab values over time with visualizations
- **Abnormal Flagging:** Automatically flag out-of-range results
- **Categories:** Group lab results by category for easier navigation
- **Reference Ranges:** Store and display reference ranges for each test
</details>

<details>
<summary><strong>🏥 AI Doctor Summary</strong></summary>

- **Two Modes:** Patient-friendly summaries and concise clinical summaries for physicians
- **Comprehensive:** Current conditions, medications, allergies, recent labs, imaging, past surgeries, vital signs
- **Structured JSON Output:** Ready for EHR/EMR integration
</details>

<details>
<summary><strong>👨‍👩‍👧‍👦 Family Groups</strong></summary>

- **Caregiver Management:** Create family groups to manage records of family members
- **Role-based Permissions:** VIEWER, EDITOR, ADMIN permission levels
- **Invite Flow:** Email-based invitations with ACCEPTED/DECLINED status
- **Patient Switcher:** Seamlessly switch between your records and family members you manage
</details>

<details>
<summary><strong>🔗 Secure Sharing</strong></summary>

- **Temporary Share Links:** Share specific resources with time-limited links
- **Access Controls:** Password protection, max access counts, email allowlists
- **Access Logs:** Full audit trail of who accessed what and when
- **QR Codes:** Share links with scannable QR codes
- **Public View:** Shared data viewable without authentication (configurable)
</details>

<details>
<summary><strong>🎤 Voice Assistant</strong></summary>

- **Bilingual:** Supports English and Hindi (हिंदी) voice interactions
- **Natural Language Queries:** Ask about medications, lab results, and timeline events using voice
- **Text-to-Speech:** AI assistant responds in natural-sounding voice
- **Multimodal:** Type or speak — both input methods supported
</details>

<details>
<summary><strong>🔍 Semantic Search</strong></summary>

- **Cross-entity Search:** Search across documents, timeline events, medications, and lab results simultaneously
- **Full-text Search:** Powered by PostgreSQL `pg_trgm` extension for fuzzy matching
- **Grouped Results:** Results organized by type (DOCUMENT, TIMELINE, MEDICATION, LAB_RESULT)
</details>

<details>
<summary><strong>🧠 AI Context & Memory</strong></summary>

- **Mem0 Integration:** Long-term memory of patient facts for context-aware AI processing
- **Multi-provider Fallback:** Mem0 and Alchemyst context providers with health checks and automatic fallback
- **Context-aware Prompts:** Extraction, timeline, and summary prompts enriched with patient history
- **Background Processing:** BullMQ queues for non-blocking AI operations
</details>

<details>
<summary><strong>🔐 Platform Features</strong></summary>

- **Clerk Authentication:** Social login (Google), email/password, passkeys, 2FA (TOTP)
- **Dark/Light Mode:** System-aware theming with premium dark mode
- **Keyboard Shortcuts:** ⌘K for search, ⌘D/T/F/M/L for navigation
- **Rate Limiting:** 10 req/s short-term, 100 req/min burst protection
- **FHIR Export:** Export entire health record as FHIR Bundle
- **ABDM Ready:** Schema and integration points for Ayushman Bharat Digital Mission
</details>

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| [Next.js 15](https://nextjs.org/) (App Router) | React framework with server components, streaming, and server actions |
| [TypeScript 5.7](https://www.typescriptlang.org/) | Type-safe development |
| [Tailwind CSS 3.4](https://tailwindcss.com/) | Utility-first CSS with `tailwindcss-animate` |
| [shadcn/ui](https://ui.shadcn.com/) | Radix UI primitives with custom styling |
| [TanStack React Query 5](https://tanstack.com/query) | Server state management, caching, auto-refetch |
| [Clerk](https://clerk.com/) | Authentication (social login, passkeys, 2FA) |
| [Framer Motion 12](https://www.framer.com/motion/) | Animation and micro-interactions |
| [Recharts 2](https://recharts.org/) | Charting and data visualization |
| [React Hook Form](https://react-hook-form.com/) | Form validation |
| [Zod 3.24](https://zod.dev/) | Schema validation |
| [Sonner](https://sonner.emilkowalski.com/) | Toast notifications |
| [Lucide React](https://lucide.dev/) | Icons |
| [date-fns 4](https://date-fns.org/) | Date formatting |

### Backend

| Technology | Purpose |
|---|---|
| [NestJS 11](https://nestjs.com/) | Node.js framework with dependency injection, guards, interceptors |
| [TypeScript 5.7](https://www.typescriptlang.org/) | Type-safe development |
| [Prisma 6.1](https://www.prisma.io/) | ORM with PostgreSQL extensions (`pg_trgm`, `vector`) |
| [PostgreSQL 16](https://www.postgresql.org/) (pgvector) | Primary database with vector support |
| [Redis 7](https://redis.io/) | BullMQ job queue backing store |
| [BullMQ 5](https://docs.bullmq.io/) | Background job processing (OCR, AI summaries, FHIR sync) |
| [Google Gemini](https://deepmind.google/technologies/gemini/) | Multi-model AI (flash models with fallback chain) |
| [Google Document AI](https://cloud.google.com/document-ai) | Production OCR processing |
| [Supabase Storage](https://supabase.com/storage) | File storage for uploaded documents |
| [Clerk Backend SDK](https://clerk.com/docs/backend-requests/overview) | JWT verification via JWKS |
| [Mem0](https://mem0.ai/) | Long-term memory for patient context |
| [Alchemyst AI](https://alchemyst.ai/) | Alternative context provider (fallback) |
| [Gnani AI](https://gnani.ai/) | Indian voice AI (STT/TTS) |
| [Swagger/OpenAPI](https://swagger.io/) | Auto-generated API documentation |
| [Helmet](https://helmetjs.github.io/) | Security headers |
| [Class-validator](https://github.com/typestack/class-validator) | DTO validation |
| [Passport](http://www.passportjs.org/) | Authentication strategies |

### Infrastructure

| Technology | Purpose |
|---|---|
| [Turborepo 2.3](https://turbo.build/) | Monorepo build orchestration with caching |
| [pnpm 10](https://pnpm.io/) | Fast, disk-efficient package manager |
| [Docker](https://www.docker.com/) | Containerized development and deployment |
| [Keploy](https://keploy.io/) | API test generation from traffic recording |
| [Vercel](https://vercel.com/) | Frontend deployment (Next.js) |

---

## Architecture

```mermaid
graph TB
    subgraph Frontend ["Frontend (Next.js 15)"]
        NEXT[Next.js App Router]
        RC[React Query Cache]
        CLERK_FE[Clerk Auth]
        UI[shadcn/ui + Tailwind]
        VOICE[Voice Assistant]
    end

    subgraph Backend ["Backend (NestJS 11)"]
        API[API Gateway<br/>/api/v1]
        GW[Global Guards<br/>ClerkAuth | Throttler]
        
        subgraph Modules ["Feature Modules"]
            AUTH[Auth Module]
            DOCS[Documents Module]
            OCR[OCR Module]
            AI[AI/Gemini Module]
            TIMELINE[Timeline Module]
            MEDS[Medications Module]
            LABS[Labs Module]
            SUMMARY[Summary Module]
            FAMILY[Family Module]
            SHARING[Sharing Module]
            SEARCH[Search Module]
            DASHBOARD[Dashboard Module]
            VOICE_MOD[Voice Module]
            FHIR[FHIR Module]
        end
        
        subgraph Context ["AI Context Layer"]
            CTX_AGG[Context Aggregator]
            PROMPT[Prompt Builder]
            MEM0[Mem0 Provider]
            ALCHEM[Alchemyst Provider]
            SYNC[Context Synchronizer]
        end
        
        subgraph Jobs ["Background Jobs (BullMQ)"]
            OCR_Q[OCR Queue]
            AI_Q[AI Summary Queue]
            SYNC_Q[Sync Queue]
            REDIS[Redis 7]
        end
    end

    subgraph Storage ["Data Layer"]
        PG[(PostgreSQL 16<br/>pgvector)]
        SUPABASE[(Supabase<br/>Object Storage)]
        CACHE[(Redis 7<br/>Cache + Queue)]
    end

    subgraph External ["External Services"]
        CLERK[Clerk API<br/>Auth + JWKS]
        GEMINI[Google Gemini<br/>Multi-model AI]
        DOC_AI[Google Document AI<br/>OCR v1]
        GNANI[Gnani AI<br/>Voice STT/TTS]
        MEM0_SVC[Mem0 API<br/>Memory Store]
        ALCHEM_SVC[Alchemyst AI<br/>Context API]
    end

    NEXT --> API
    RC --> API
    CLERK_FE --> CLERK
    VOICE --> GNANI
    VOICE --> API

    API --> GW
    GW --> Modules
    
    Modules --> CTX_AGG
    Modules --> PG
    DOCS --> OCR
    OCR --> DOC_AI
    OCR --> AI
    OCR --> SUPABASE
    AI --> GEMINI
    CTX_AGG --> MEM0
    CTX_AGG --> ALCHEM
    CTX_AGG --> PROMPT
    CTX_AGG --> SYNC
    SYNC --> MEM0_SVC
    SYNC --> ALCHEM_SVC
    AI --> MEM0_SVC

    OCR --> OCR_Q
    AI --> AI_Q
    SYNC --> SYNC_Q
    OCR_Q --> REDIS
    AI_Q --> REDIS
    SYNC_Q --> REDIS

    SEARCH --> PG
    VOICE_MOD --> GNANI
    FHIR --> CLERK
```

### Design Patterns

- **Module-based Architecture:** Each feature (documents, medications, timeline, etc.) is a self-contained NestJS module with its own controller, service, DTOs, and entities.
- **Guard-based Auth:** Global `ClerkAuthGuard` with `@Public()` decorator for skip-auth routes. `@CurrentUser()` decorator injects the authenticated user.
- **Interceptor Pattern:** Global `TransformInterceptor` wraps all responses in `{ data: ... }` automatically. Exception filter provides consistent error structure.
- **Multi-model AI Fallback:** The Gemini service chains through models (`gemini-3.5-flash` → `gemini-3.1-flash-lite` → ...) if one fails.
- **Context Aggregation:** AI prompts are enriched with patient context from multiple providers (Mem0, Alchemyst) with health checks and automatic fallback.
- **Background Processing:** Long-running operations (OCR, AI generation, sync) are queued via BullMQ to keep API responsiveness.
- **Patient Context Switching:** A React context provider manages the "viewing as" patient, invalidating all React Query caches on switch.

---

## Folder Structure

```
medconnect-india/
├── frontend/                          # Next.js 15 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/                # Authentication pages (sign-in, sign-up)
│   │   │   ├── (dashboard)/           # Dashboard, documents, timeline, etc.
│   │   │   ├── onboarding/            # First-time user onboarding
│   │   │   ├── public/share/[token]/  # Public shared record view
│   │   │   ├── layout.tsx             # Root layout (fonts, providers)
│   │   │   ├── page.tsx               # Entry point (redirects to /dashboard or /sign-in)
│   │   │   └── globals.css            # Global styles, CSS variables, Clerk overrides
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui components (card, button, badge, etc.)
│   │   │   ├── auth/                  # Authentication components (Google button)
│   │   │   ├── documents/             # Document uploader
│   │   │   ├── premium/              # Premium dashboard widgets (health score, insights, etc.)
│   │   │   ├── voice/                 # Voice recorder, player, assistant
│   │   │   ├── patient-switcher.tsx   # Switch between own/family member records
│   │   │   ├── patient-context.tsx    # Patient selection context provider
│   │   │   ├── mode-toggle.tsx        # Dark/light mode toggle
│   │   │   ├── theme-provider.tsx     # next-themes provider
│   │   │   └── error-boundary.tsx     # React error boundary
│   │   ├── hooks/                     # Custom React hooks (use-dashboard, use-voice, etc.)
│   │   ├── lib/
│   │   │   ├── api-client.ts          # Full API client (all endpoints)
│   │   │   └── utils.ts              # cn() utility, formatDate, etc.
│   │   ├── providers/
│   │   │   ├── index.tsx             # Clerk + React Query + Theme + Sonner
│   │   │   └── token-provider.tsx     # Clerk token injection into API client
│   │   └── middleware.ts             # Clerk middleware for route protection
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── vercel.json                   # Vercel deployment config
│
├── backend/                           # NestJS 11 backend
│   ├── src/
│   │   ├── main.ts                   # Bootstrap (Swagger, CORS, Helmet, pipes, filters)
│   │   ├── app.module.ts             # Root module (imports all feature modules)
│   │   ├── common/
│   │   │   ├── decorators/           # @CurrentUser(), @Public(), @Roles()
│   │   │   ├── dto/                  # Shared DTOs (pagination, API response)
│   │   │   ├── filters/             # Global exception filter
│   │   │   ├── guards/              # ClerkAuthGuard (JWT verification via JWKS)
│   │   │   └── interceptors/        # TransformInterceptor ({ data: ... } wrapper)
│   │   └── modules/
│   │       ├── ai/                  # Gemini service (multi-model fallback)
│   │       ├── ai-context/          # AI context aggregation (Mem0, Alchemyst)
│   │       ├── auth/                # Clerk strategy, sync, onboarding
│   │       ├── dashboard/           # Dashboard stats, health score
│   │       ├── database/            # Prisma service & module
│   │       ├── documents/           # Document CRUD, upload, download
│   │       ├── family/              # Family groups, invitations, permissions
│   │       ├── fhir/                # FHIR export and import
│   │       ├── health/              # Health check endpoint
│   │       ├── labs/                # Lab results CRUD
│   │       ├── medications/         # Medication CRUD, reminders
│   │       ├── memory/              # Mem0 provider, cache, synchronizer, sanitizer
│   │       ├── ocr/                 # Google Document AI OCR pipeline
│   │       ├── search/              # Full-text search across entities
│   │       ├── sharing/             # Share links, access logs, public view
│   │       ├── storage/             # Supabase Storage abstraction
│   │       ├── summary/             # Doctor/patient AI summaries
│   │       ├── timeline/            # Timeline events, AI summary, generation
│   │       └── voice/               # STT, TTS, conversational AI via Gnani
│   ├── test/                        # E2E tests
│   ├── docker-compose.yml           # PostgreSQL + Redis + API
│   └── Dockerfile                   # Multi-stage production build
│
├── database/                         # Database layer
│   ├── prisma/
│   │   ├── schema.prisma            # Complete schema (21 models, 15 enums)
│   │   └── migrations/              # Prisma migrations
│   └── src/
│       └── index.ts                 # Re-exports Prisma client
│
├── packages/                         # Shared packages
│   ├── shared-types/                 # TypeScript interfaces shared FE/BE
│   └── fhir-parser/                  # FHIR resource parsing utilities
│
├── docs/
│   └── keploy.md                    # Keploy integration guide
│
├── .github/workflows/
│   └── keploy-ci.yml                # CI pipeline (3 jobs: quality, tests, regression)
│
├── turbo.json                        # Turborepo pipeline configuration
├── pnpm-workspace.yaml               # pnpm workspaces
├── keploy.yml                        # Keplay test configuration
└── package.json                      # Root scripts
```

---

## Getting Started

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | >= 20.0.0 | `node --version` |
| pnpm | >= 9.0.0 | `pnpm --version` |
| Docker | Latest | `docker --version` |
| PostgreSQL | 16 (via Docker) | — |
| Redis | 7 (via Docker) | — |

### Installation

```bash
# 1. Clone the repository (replace URL with your fork)
git clone <your-repo-url>
cd medconnect-india

# 2. Install dependencies
pnpm install

# 3. Set environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials (see table below)

# 4. Start infrastructure (PostgreSQL + Redis)
pnpm docker:up

# 5. Run database migrations
pnpm db:migrate

# 6. Start development servers
pnpm dev
```

The frontend starts at **http://localhost:3000** and the API at **http://localhost:3001/api/v1**. Swagger docs are at **http://localhost:3001/api/v1/docs**.

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://postgres:password@localhost:5432/medconnect?schema=public` | PostgreSQL connection string |
| `DIRECT_URL` | **Yes** | Same as above | Direct connection for migrations |
| `API_PORT` | No | `3001` | Backend server port |
| `API_PREFIX` | No | `/api/v1` | Global API route prefix |
| `NODE_ENV` | No | `development` | Environment mode |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origins |
| `CLERK_SECRET_KEY` | **Yes** | — | Clerk API secret key |
| `CLERK_PUBLISHABLE_KEY` | **Yes** | — | Clerk publishable key (frontend) |
| `CLERK_WEBHOOK_SECRET` | Yes | — | Clerk webhook verification secret |
| `SUPABASE_URL` | **Yes** | — | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | **Yes** | — | Supabase service role key |
| `SUPABASE_STORAGE_BUCKET` | No | `documents` | Storage bucket name |
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `MEM0_API_KEY` | No | — | Mem0 memory API key |
| `ALCHEMYST_API_KEY` | No | — | Alchemyst AI context API key |
| `GNANI_API_KEY` | No | — | Gnani voice AI API key |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | `{}` | GCP service account JSON |
| `GOOGLE_DOC_AI_PROCESSOR_ID` | No | — | Document AI processor ID |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection for BullMQ |
| `JWT_SECRET` | No | `change-this-in-production` | Local JWT secret |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** (FE) | — | Clerk publishable key for frontend |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001/api/v1` | Backend API URL for frontend |

### Available Scripts

#### Root (Monorepo)

| Script | Description |
|---|---|
| `pnpm dev` | Start all dev servers (frontend + backend) |
| `pnpm build` | Build all packages and applications |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Type-check all packages |
| `pnpm clean` | Clean all build outputs |
| `pnpm test` | Run all tests |
| `pnpm test:all` | Run tests + coverage + regression |
| `pnpm docker:up` | Start PostgreSQL + Redis via Docker |
| `pnpm docker:down` | Stop Docker services |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |

#### Backend (`backend/package.json`)

| Script | Description |
|---|---|
| `pnpm dev` | Start NestJS in watch mode |
| `pnpm build` | Build NestJS application |
| `pnpm start` | Start production server |
| `pnpm start:prod` | Start production server (alias) |
| `pnpm lint` | ESLint all TypeScript files |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Jest unit tests |
| `pnpm test:e2e` | Jest E2E tests |
| `pnpm test:coverage` | Jest with coverage report |

> **Note:** The `backend/test/` directory contains utility test scripts (`test-timeline.ts`, `test-sharing.ts`, `test-query.js`, etc.) primarily used for Keploy recording workflow validation, not for automated CI.
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:migrate:prod` | Deploy migrations (production) |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm keploy:record` | Record API traffic via Keploy |
| `pnpm keploy:test` | Replay Keploy test suites |

#### Frontend (`frontend/package.json`)

| Script | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server (port 3000) |
| `pnpm build` | Build Next.js for production |
| `pnpm start` | Start production Next.js server |
| `pnpm lint` | Next.js lint |
| `pnpm typecheck` | TypeScript type checking |

---

## Build

```bash
# Build all packages and applications
pnpm build

# Build individual workspace
pnpm --filter @medconnect/api build
pnpm --filter @medconnect/web build
```

### Production

```bash
# Build the backend
pnpm --filter @medconnect/api build

# Start with production config
NODE_ENV=production API_PORT=3001 node backend/dist/main
```

---

## Deployment

### Frontend (Vercel)

The frontend is configured for Vercel deployment via `frontend/vercel.json`:

```bash
cd frontend
vercel --prod
```

Set the following environment variables in the Vercel dashboard:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL`
- `CLERK_SECRET_KEY`

### Backend (Docker)

```bash
# Build the Docker image
docker build -f backend/Dockerfile -t medconnect-api .

# Run with all services
docker compose -f backend/docker-compose.yml up -d
```

The multi-stage Dockerfile produces a production-ready image at ~150 MB (Alpine-based, non-root user, `tini` init process).

---

## Docker

### Development Stack

```yaml
# backend/docker-compose.yml starts:
# - PostgreSQL 16 with pgvector (port 5432)
# - Redis 7 (port 6379)
# - NestJS API (port 3001, rebuilds on change)
```

```bash
# Start infrastructure only (for local dev)
docker compose -f backend/docker-compose.yml up -d db cache

# Start everything (full stack)
docker compose -f backend/docker-compose.yml up -d
```

### Production Build

```bash
# Multi-stage Dockerfile:
# 1. Builder stage: installs deps, generates Prisma, builds shared packages, builds NestJS
# 2. Runner stage: minimal Alpine image with tini, runs as non-root 'nestjs' user

docker build -f backend/Dockerfile -t medconnect-api .
docker run -p 3001:3001 --env-file backend/.env medconnect-api
```

---

## API Documentation

The API is fully documented via Swagger/OpenAPI, auto-generated by the `@nestjs/swagger` plugin. When running locally, visit:

```
http://localhost:3001/api/v1/docs
```

### API Prefix

All endpoints are prefixed with `/api/v1`.

### Authentication

Most endpoints require a Bearer token (Clerk JWT). Acquire one via the frontend sign-in flow:

```http
Authorization: Bearer <clerk_jwt_token>
```

Public endpoints (no auth required):

- `GET /api/v1/health`
- `GET /api/v1/sharing/public/:token`
- `POST /api/v1/auth/webhooks` (Clerk webhooks)

### Response Format

All successful responses are wrapped in `{ data: ... }`. Error responses follow `{ success: false, error: { message, statusCode, timestamp, path } }`.

### Endpoints Summary

<details>
<summary><strong>Health</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Server health check (public) |
</details>

<details>
<summary><strong>Auth</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/sync` | Sync Clerk user to local database, returns onboarding status |
| `POST` | `/api/v1/auth/onboard` | Complete onboarding (create patient profile) |
</details>

<details>
<summary><strong>Documents</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/documents/upload` | Upload a medical document (multipart, max 20MB) |
| `GET` | `/api/v1/documents` | List all user documents (with pagination, filters) |
| `GET` | `/api/v1/documents/:id` | Get document details with extraction |
| `PATCH` | `/api/v1/documents/:id` | Update document metadata |
| `POST` | `/api/v1/documents/:id/process` | (Re)process document OCR |
| `POST` | `/api/v1/documents/:id/regenerate` | Regenerate extraction (alias) |
| `DELETE` | `/api/v1/documents/:id` | Delete a document |
| `GET` | `/api/v1/documents/:id/download` | Get signed download URL |
</details>

<details>
<summary><strong>Timeline</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/timeline` | List timeline events (paginated, filterable) |
| `GET` | `/api/v1/timeline/summary` | Get timeline summary (counts by type/month) |
| `GET` | `/api/v1/timeline/ai-summary` | AI-generated narrative summary of last month |
| `GET` | `/api/v1/timeline/:id` | Get single timeline event |
| `POST` | `/api/v1/timeline` | Create manual timeline event |
| `POST` | `/api/v1/timeline/generate` | Generate events from extractions (AI) |
| `DELETE` | `/api/v1/timeline/:id` | Delete timeline event |
</details>

<details>
<summary><strong>Medications</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/medications` | List medications (optional `isActive` filter) |
| `GET` | `/api/v1/medications/:id` | Get single medication |
| `POST` | `/api/v1/medications` | Create medication |
| `PATCH` | `/api/v1/medications/:id` | Update medication |
| `DELETE` | `/api/v1/medications/:id` | Delete medication |
</details>

<details>
<summary><strong>Labs</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/labs` | List lab results (paginated) |
| `GET` | `/api/v1/labs/:id` | Get single lab result |
| `POST` | `/api/v1/labs` | Create lab result |
| `PATCH` | `/api/v1/labs/:id` | Update lab result |
| `DELETE` | `/api/v1/labs/:id` | Delete lab result |
</details>

<details>
<summary><strong>Doctor Summary</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/summary/patient` | Get patient-friendly summary |
| `GET` | `/api/v1/summary/doctor` | Get clinical doctor summary |
</details>

<details>
<summary><strong>Family</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/family/groups` | List family groups (owned + member of) |
| `POST` | `/api/v1/family/groups` | Create family group |
| `POST` | `/api/v1/family/groups/:id/invite` | Invite member by email |
| `POST` | `/api/v1/family/groups/:id/respond` | Accept/reject invitation |
| `DELETE` | `/api/v1/family/groups/:id/members/:memberId` | Remove member |
| `DELETE` | `/api/v1/family/groups/:id` | Delete family group |
</details>

<details>
<summary><strong>Sharing</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/sharing/links` | List share links |
| `POST` | `/api/v1/sharing/links` | Create share link (with resources, expiry) |
| `DELETE` | `/api/v1/sharing/links/:id` | Revoke share link |
| `GET` | `/api/v1/sharing/public/:token` | Access shared resources (public) |
</details>

<details>
<summary><strong>Search</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/search?q=` | Full-text search across all entities |
</details>

<details>
<summary><strong>Dashboard</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/dashboard/stats` | Dashboard statistics (documents, medications, labs, health score) |
</details>

<details>
<summary><strong>Voice</strong></summary>

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/voice/speech-to-text` | Convert speech to text (multipart audio) |
| `POST` | `/api/v1/voice/text-to-speech` | Convert text to speech audio |
| `POST` | `/api/v1/voice/chat` | Voice conversation (STT → AI → TTS) |
</details>

<details>
<summary><strong>FHIR</strong></summary>

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/fhir/export` | Export all patient data as FHIR Bundle |
</details>

---

## Usage Examples

### Upload a Prescription

```bash
curl -X POST http://localhost:3001/api/v1/documents/upload \
  -H "Authorization: Bearer <clerk_token>" \
  -F "file=@prescription.pdf" \
  -F "documentType=PRESCRIPTION"
```

### Get AI Timeline Summary

```bash
curl http://localhost:3001/api/v1/timeline/ai-summary \
  -H "Authorization: Bearer <clerk_token>"
```

### Create a Share Link

```bash
curl -X POST http://localhost:3001/api/v1/sharing/links \
  -H "Authorization: Bearer <clerk_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Doctor Visit - March 2026",
    "expiresInDays": 7,
    "resources": [
      { "resourceType": "DOCUMENT", "resourceId": "doc_xxx" },
      { "resourceType": "TIMELINE", "resourceId": "timeline_xxx" }
    ]
  }'
```

### Invite Family Member

```bash
curl -X POST http://localhost:3001/api/v1/family/groups/<group_id>/invite \
  -H "Authorization: Bearer <clerk_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "family@example.com",
    "relation": "SPOUSE"
  }'
```

### Voice Chat (Hindi)

```bash
# Record a question (e.g., "मेरी दवाएं क्या हैं?")
curl -X POST http://localhost:3001/api/v1/voice/chat \
  -H "Authorization: Bearer <clerk_token>" \
  -F "audio_file=@question.wav" \
  -F "language_code=hi-IN"
```

---

## Testing

### Unit Tests

```bash
# Run all Jest unit tests (backend)
pnpm test

# With coverage
pnpm test:coverage
```

### API Regression Tests (Keploy)

Keploy records real API traffic and replays it for regression detection.

```bash
# 1. Install Keploy CLI
pnpm keploy:init

# 2. Start dependencies & record API traffic
pnpm docker:keploy:record

# 3. Interact with the API (via frontend, curl, or Postman)
# 4. Stop recording (Ctrl+C), then replay tests
pnpm docker:keploy:test
```

See [docs/keploy.md](docs/keploy.md) for the complete Keploy integration guide.

### E2E Tests

```bash
pnpm test:e2e
```

---

## Linting & Formatting

```bash
# Lint all workspaces
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck
```

- **ESLint** with `typescript-eslint` for TypeScript linting
- **Prettier** for code formatting (configuration in `.prettierrc`)
- **Next.js ESLint** configuration for frontend

---

## CI/CD

The GitHub Actions workflow (`.github/workflows/keploy-ci.yml`) runs on every push to `main`/`develop` and every PR to `main`:

```mermaid
graph LR
    PUSH[Push / PR] --> QUALITY[Quality Checks<br/>Lint → TypeCheck → Build]
    QUALITY --> JEST[Jest Tests<br/>Unit + Coverage]
    QUALITY --> KEPLOY[Keploy Regression<br/>Replay API Tests]
    JEST --> SUMMARY[CI Summary]
    KEPLOY --> SUMMARY
```

**Pipeline details:**

1. **Quality Checks** (ubuntu-latest, Node 24): lint, typecheck, build (backend only)
2. **Jest Tests**: unit tests with coverage, uploaded as artifact
3. **Keploy Regression**: replays previously recorded API test suites, fails on regression
4. **Summary**: aggregates results from all stages

The CI skips frontend changes (`frontend/**`) and markdown/docs to optimize for backend-focused Keploy tests.

---

## Security Notes

- **Authentication:** All API routes (except `@Public()` decorated) require Clerk JWT verification via JWKS. Tokens are verified on every request.
- **Rate Limiting:** 10 requests/second short-term, 100 requests/minute medium-term via `@nestjs/throttler`.
- **Helmet:** Security headers enabled (CSP, XSS, frame options, etc.).
- **Input Validation:** Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`. DTOs validated with `class-validator`.
- **File Upload Validation:** Multipart uploads validated by file type regex and 20 MB size limit.
- **Document Storage:** Files stored in Supabase Storage with signed URLs for download; direct file access prevented.
- **Share Links:** Time-limited with optional password protection, max access count, and email allowlisting.
- **Docker Security:** Non-root user (`nestjs`), Alpine base, `tini` init process.
- **PII Masking:** Keplay test recordings sanitized of patient identifiers, medical IDs, timestamps, and auth tokens.

---

## Performance Optimizations

- **React Query:** 5-minute stale time, 30-minute garbage collection, 2 retry attempts, no refetch on window focus
- **Prisma:** Connection pooling via `pgbouncer`-compatible `directUrl`, indexed fields on all query paths
- **BullMQ:** Background processing for OCR, AI summaries, and data sync — no blocking of API responses
- **Multi-model AI Fallback:** Falls through model tiers if primary is slow or unavailable
- **Context Caching:** Patient context cached for 2 minutes to reduce redundant database queries
- **Turborepo Caching:** Build outputs cached by `turbo.json` — subsequent builds are incremental
- **Image Optimization:** `next.config.ts` remote patterns for Supabase and Clerk images
- **Server Actions:** 10 MB body size limit for large document uploads
- **PostgreSQL Extensions:** `pg_trgm` for fuzzy text search, `vector` for future embedding-based search

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `pnpm install` fails with lockfile mismatch | Run `pnpm install --frozen-lockfile` or delete `pnpm-lock.yaml` and reinstall |
| Prisma client not found | Run `pnpm --filter @medconnect/api db:generate` |
| Database connection refused | Ensure Docker containers are running: `pnpm docker:up` |
| Clerk auth fails | Verify `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` are set correctly |
| AI features return nothing | Set `GEMINI_API_KEY` in `backend/.env` |
| Voice features fail | Set `GNANI_API_KEY` — voice works without it for transcript-only mode |
| File upload fails | Check Supabase credentials; verify bucket exists and is public |
| Keploy tests not found | Record test suites first: `pnpm keploy:record` |

---

## Roadmap

Inferred from codebase analysis, comments, and architecture:

- [x] Core document OCR and extraction pipeline
- [x] Health timeline with AI generation
- [x] Medication and lab result tracking
- [x] Family groups and secure sharing
- [x] AI-powered doctor/patient summaries
- [x] Voice assistant (English + Hindi)
- [x] Semantic search
- [x] Patient context switching
- [x] Mem0-powered long-term memory
- [x] Multi-model AI fallback chain
- [ ] **FHIR import** — Pull data from ABDM and other FHIR-compatible sources
- [ ] **Appointment scheduling** — Calendar integration with reminders
- [ ] **Telehealth integration** — Direct EHR sharing with healthcare providers
- [ ] **Mobile app** — React Native or Flutter companion app
- [ ] **Offline mode** — PWA with local-first data sync
- [ ] **AI health insights** — Predictive analytics for chronic condition management
- [ ] **Insurance claims integration** — Auto-populate claim forms from records
- [ ] **Blood group/donor registry** — Integration with blood bank networks
- [ ] **Multi-language support** — Tamil, Telugu, Bengali, Marathi

---

## Known Issues

- **Gemini model names:** The fallback chain references `gemini-3.5-flash` and `gemini-3.1-flash-lite` which are speculative. Actual model names depend on Google's release schedule.
- **User auto-creation in guard:** The `ClerkAuthGuard` does a forced upsert of a development user when `CLERK_SECRET_KEY` is a dummy value. This should only affect local dev.
- **Voice STT/TTS dependency:** Relies on Gnani AI, which may have availability constraints outside India. The `VoiceRecorder` component still captures audio locally even without Gnani.
- **Keploy on macOS:** Docker-based recording is required (eBPF not available natively). See [docs/keploy.md](docs/keploy.md).

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create a feature branch:** `git checkout -b feat/your-feature`
3. **Commit your changes:** `git commit -m 'feat: add amazing feature'`
4. **Push:** `git push origin feat/your-feature`
5. **Open a Pull Request**

### Development Conventions

- **Commit messages:** Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`, etc.)
- **TypeScript:** Strict mode enabled. Avoid `any` types (see recent refactoring efforts).
- **NestJS Modules:** One module per domain. DTOs in `dto/` subdirectory.
- **React Components:** "use client" directive for interactive components. Server components preferred where possible.
- **Testing:** Jest for unit tests, Keploy for API regression tests. Aim for >80% coverage on new code.
- **Formatting:** Prettier with default config. Run `pnpm format` before committing.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

- **Google Gemini & Document AI** for powering our medical document understanding
- **Clerk** for seamless authentication infrastructure
- **Supabase** for secure document storage
- **Mem0** for long-term patient memory
- **Gnani AI** for Indian language voice capabilities
- **Alchemyst AI** for alternative context provision
- **Keploy** for automated API regression testing
- **[shadcn/ui](https://ui.shadcn.com/)** for the component system
- **[TanStack](https://tanstack.com/)** for React Query
- The **Indian healthcare community** for inspiring this project

---

## Information Needed

- **Live Demo URL:** Not currently available. Deploy via Vercel + your own infrastructure to try it live.
- **Maintainer Contact:** See the project's GitHub repository for issues and discussions.
- **ABDM Sandbox Access:** Required for ABDM integration testing. Apply via the [Ayushman Bharat Digital Mission](https://abdm.gov.in/) portal.

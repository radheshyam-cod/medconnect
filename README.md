# MedConnect India

**MedConnect India** is an AI-powered Personal Health Record (PHR) platform tailored for the Indian healthcare ecosystem. It allows users to securely manage their health records, extract insights from medical documents using AI, share records with family or caregivers, and keep track of their medical timelines, medications, and lab results.

## 🚀 Features

- **AI-Powered OCR & Extraction:** Upload prescriptions, lab reports, and discharge summaries. The platform uses Google Document AI and Generative AI to automatically extract medications, diseases, lab values, and other key information.
- **Smart Health Timeline:** Automatically builds a chronological timeline of your health events from uploaded documents and manual entries.
- **Doctor Summaries:** AI-generated health summaries to easily share with healthcare providers, highlighting current conditions, medications, and recent lab results.
- **Family Groups & Sharing:** Securely share your health records with family members or caregivers using role-based access control and temporary share links.
- **Medication Reminders:** Track active medications and get reminders.
- **FHIR & ABDM Integration:** Ready for integration with the Ayushman Bharat Digital Mission (ABDM) and standard FHIR APIs.

## 🏗️ Architecture & Tech Stack

This project is a monorepo managed with **Turborepo** and **pnpm** workspaces.

### Frontend (`/frontend`)
- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Authentication:** [Clerk](https://clerk.com/)
- **State Management & Data Fetching:** [TanStack React Query](https://tanstack.com/query/latest)
- **Charts:** [Recharts](https://recharts.org/)

### Backend (`/backend`)
- **Framework:** [NestJS 11](https://nestjs.com/)
- **Database ORM:** [Prisma](https://www.prisma.io/)
- **Job Queues:** [BullMQ](https://docs.bullmq.io/) & Redis
- **AI & ML:** Google Document AI, Google Generative AI, [Mem0](https://github.com/mem0ai/mem0)
- **API Testing:** [Keploy](https://keploy.io/)

### Database (`/database`)
- **Database:** PostgreSQL (with `pg_trgm` and `vector` extensions)
- **Schema Management:** Prisma
- Handles complex relationships between Users, Family Groups, Documents, Extractions, Timelines, Medications, and Lab Results.

### Shared Packages (`/packages`)
- `@medconnect/shared-types`: Shared TypeScript definitions and Zod schemas across the frontend and backend.
- `@medconnect/fhir-parser`: Utilities for parsing and handling FHIR data formats.

## 🛠️ Getting Started

### Prerequisites
- Node.js (>= 20.0.0)
- pnpm (>= 9.0.0)
- Docker & Docker Compose (for local Redis/PostgreSQL and Keploy)

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Environment Variables:**
   - Copy `.env.example` to `.env` in the root and in the respective `frontend` and `backend` directories.
   - Fill in your API keys for Clerk, Google Cloud (Document AI, Gemini), Database URL, etc.

3. **Database Setup:**
   - Start the local database (if using docker-compose from backend):
     ```bash
     pnpm docker:up
     ```
   - Run Prisma migrations:
     ```bash
     pnpm db:migrate
     ```

### Running the Application

To start the development servers for all applications and packages simultaneously:
```bash
pnpm dev
```
- The frontend will typically run on `http://localhost:3000`
- The backend API will be available on the port configured in your environment.

### Testing

The backend includes comprehensive API testing via Keploy.
To run all tests:
```bash
pnpm test:all
```
For Keploy record and replay:
```bash
pnpm keploy:record
pnpm keploy:test
```

## 📄 License

This project is licensed under the MIT License.

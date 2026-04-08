# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Ada21Tech Assessment Platform - an educational website for Ethiopian students (grades 6-12) to practice for national exams.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend framework**: React + Vite (Tailwind CSS, shadcn/ui)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Gemini (via Replit AI Integrations)
- **Router**: Wouter

## Artifacts

- **student-assessment** (`/`) — Main frontend React app with student and admin portals
- **api-server** (`/api`) — Express backend with PostgreSQL

## Key Features

- Student registration/login with grade selection and TeleBirr payment receipt
- Admin portal to manage students, questions, subjects, grade prices
- Quiz sessions with timer, multiple-choice questions, AI feedback
- Student dashboard with performance tracking and progress analytics
- AI-powered feedback using Gemini after each quiz session

## Default Credentials

- **Admin**: username `admin`, password `121621`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

```
artifacts/
  student-assessment/  - React/Vite frontend (port 25138)
  api-server/          - Express API server (port 8080)
lib/
  db/                  - Drizzle ORM schemas (students, admins, subjects, questions, sessions, ai_feedback)
  api-zod/             - Zod validation schemas (generated from OpenAPI)
  api-client-react/    - React Query hooks (generated from OpenAPI)
  api-spec/            - OpenAPI spec (openapi.yaml)
  integrations-gemini-ai/ - Gemini AI integration
```

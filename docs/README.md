# Pixel — Client Issue Tracker

A professional B2B SaaS platform for website monitoring, issue management, and client communication. Built for web agencies that manage multiple client websites and need a structured system to track, prioritize, and resolve issues with full lifecycle visibility.

## What This Does

**Clients** (website owners) can log in, view the status of their websites, report issues with structured metadata, track progress in real time, and receive notifications when issues are resolved.

**Managers** (agency support team) can view all issues across all clients, respond to clients, update issue status and severity, and access a complete audit history of every change made to every issue.

## Demo Accounts

| Role    | Email                      | Password  |
|---------|----------------------------|-----------|
| Client  | client1@pixeltest.com      | Test@1234 |
| Client  | client2@pixeltest.com      | Test@1234 |
| Manager | manager@pixeltest.com      | Test@1234 |

- **Client 1** (Rahul Sharma) — 2 sites, 4 issues across all statuses
- **Client 2** (Priya Patel) — 2 sites, 2 issues including a critical one
- **Manager** (Martand Deshpande) — full visibility across all clients and sites

## Tech Stack

| Layer         | Technology                                                   |
|---------------|--------------------------------------------------------------|
| Frontend      | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui    |
| API Layer     | Next.js API Routes                                           |
| Database      | Supabase (PostgreSQL + pgvector extension)                   |
| Auth          | Supabase Auth with Row Level Security                        |
| Realtime      | Supabase Realtime (live notifications)                       |
| AI Service    | Python 3.11+, FastAPI                                        |
| Embeddings    | BGE-M3 via HuggingFace Inference API                         |
| Vector Search | pgvector with ivfflat cosine similarity index                |
| LLM           | Groq llama-3.3-70b-versatile via LiteLLM                     |

## Project Structure

```
pixel-assessment/
├── web/              — Next.js frontend + API routes
├── ai-service/       — Python FastAPI AI microservice
└── docs/             — Architecture and workflow documentation
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account (free tier works)
- Groq API key — free at console.groq.com
- HuggingFace API key — free at huggingface.co

### 1 — Database Setup

**Enable pgvector extension:**
Supabase Dashboard → Database → Extensions → search "vector" → Enable

**Run schema:**
SQL Editor → New query → paste `web/src/lib/supabase/schema.sql` → Run

**Create auth users:**
Authentication → Users → Add user — create all three accounts listed above

**Get their UUIDs:**
```sql
select id, email from auth.users order by created_at;
```

**Seed the database:**
Replace all `REPLACE_WITH_*_AUTH_ID` placeholders in `web/src/lib/supabase/seed.sql` with the real UUIDs, then run it in SQL Editor.

### 2 — Web App

```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

### 3 — AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
```

### 4 — Verify Everything Works

```bash
# DB connected (expects 401 — correct)
curl http://localhost:3000/api/sites

# AI service live
curl http://localhost:8000/

# AI analysis working
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"title":"Test issue","description":"Verifying the AI analysis pipeline is live and returning structured responses from the RAG pipeline."}'
```

## Features

### Client

- Site dashboard with live status indicators (Online / Down / Degraded / Unknown)
- Issue creation with type, severity, site selection, and optional attachment
- AI-powered severity and category suggestions before submission
- Issue detail with full visual timeline history
- Real-time notifications via Supabase Realtime

### Manager

- Complete issue management across all clients and sites
- Status and severity updates with automatic timeline logging
- Response system — client notified on every reply
- AI Insights panel on every issue — summary, recommended actions, draft response
- Re-analyze capability for refreshed AI context
- Full audit history — every status change, severity change, and comment logged

### AI Analysis (triggered on every issue)

- Severity recommendation
- Category classification
- Concise issue summary
- Recommended resolution actions
- Draft response ready for the manager to send
- Similar resolved issues via RAG (pgvector similarity search)
- Confidence score

## Assumptions

- **Site monitoring** uses mock status data. Real uptime checking via scheduled HTTP HEAD requests would be the production implementation.
- **Email notifications** are logged to the console. Resend or SendGrid would replace this in production — the notification utility is already structured for this swap.
- **The AI service** runs as a separate process on port 8000. In production it deploys independently on Railway.
- **pgvector RAG** returns empty `similar_issues` on a fresh database. The LLM analysis still works — it just lacks historical context until resolved issues accumulate.

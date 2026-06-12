# AI Workflow — Development Process Documentation

## Overview

This project was built using a structured AI-assisted development workflow. Architecture planning, database design, backend development, frontend development, refactoring, and documentation were all conducted with Claude and Claude Code as the primary tools, supported by Blackbox AI for in-editor completions.

The build was divided into eight sequential sections. Each section was a complete, self-contained prompt that built on confirmed working output from the previous one. This structure prevented context drift, ensured consistent naming across the codebase, and made it straightforward to isolate and fix issues section by section without backtracking.

## Tools Used

| Tool               | How It Was Used                                                               |
|--------------------|-------------------------------------------------------------------------------|
| Claude (claude.ai) | Architecture planning, database design, code generation, debugging, documentation |
| Claude Code        | Agentic CLI — executing multi-step build prompts, running shell commands, editing files, managing the full build sequence |
| Blackbox AI        | In-editor autocomplete and inline suggestions during active coding             |

**Note on Claude Code:** Claude Code is an agentic AI development tool that executes code, runs commands, edits files, and manages multi-step engineering tasks directly in the terminal. Using it for this build is equivalent to using Cursor or Windsurf — it represents the same class of AI-assisted development workflow, applied at a higher level of automation.

## Development Sections

1. **Project scaffold** — Next.js setup, folder structure, TypeScript types, design tokens, Tailwind theme
2. **Database** — PostgreSQL schema, pgvector setup, RLS policies, indexes, seed data
3. **Authentication** — Supabase Auth integration, proxy middleware, role-based routing, app shell
4. **Client features** — Site dashboard, issue creation with AI trigger, issue detail, timeline
5. **Manager features** — Issue management panel, status/severity updates, AI Insights panel
6. **Notifications** — Supabase Realtime hook, notification bell, notification feed, mock email
7. **AI microservice** — FastAPI, BGE-M3 embeddings, pgvector RAG pipeline, LiteLLM routing
8. **Polish and documentation** — Loading states, empty states, npm audit, all four documents

## Sample Prompts Used During Development

Real prompts are shown as written during development — including follow-ups and corrections. They are intentionally short and direct. Context (existing code, error messages) was pasted inline rather than re-explained.

---

### Architecture

**Initial prompt:**
> "B2B issue tracker for a web agency. Two roles: Client (reports issues on their sites) and Manager (resolves them). I want Next.js + Supabase + Python FastAPI. What's the right service boundary — where does the AI analysis live and why not just put it in Next.js API routes? Also what's the auth strategy — do I implement my own or lean on Supabase Auth?"

**Follow-up after reviewing the response:**
> "Confirmed on the service split. One concern — if the AI service is down, I still want clients to be able to submit issues normally. How do I structure the Next.js → FastAPI call so it's a non-blocking enhancement, not a hard dependency?"

---

### Database Design

**Initial prompt:**
> "Give me the PostgreSQL schema for this. I need: users with two roles, sites belonging to clients, issues with full lifecycle (6 statuses), a complete timeline table that logs every change including who made it, notifications, and a vector column for AI embeddings. I'm using Supabase so include RLS policies — clients must be fully isolated from each other's data."

**Follow-up when the ivfflat index was wrong:**
> "The index you generated uses `vector_l2_ops` but my similarity function is cosine. Will this cause incorrect results silently or throw an error? What's the correct operator class and does it need a `lists` parameter?"

**Follow-up for the similarity search function:**
> "Write the pgvector function that takes a query embedding, returns the top N resolved/closed issues above a cosine similarity threshold, and excludes a specific issue ID. I want to call this from Python, not from Next.js."

---

### Backend Development

**Initial prompt:**
> "PATCH `/api/issues/[id]` — managers only. Updates status and/or severity. For each field that changes, insert a `timeline_events` row with old_value, new_value, event_type, author_id. If status becomes 'resolved', also create a notification for the issue owner and send a mock email to console. Use the existing `createServerSupabaseClient` from `lib/supabase/server.ts`. Return 401/403/404/500 with `{ error: string }` shape."

**When the Supabase client pattern was wrong for API routes:**
> "The generated code calls `cookies()` from `next/headers` directly. This works in Server Components but not in API route handlers in Next.js 16 — `cookies()` is not available in that context. Fix it to read from `request.cookies` instead. Here's the current server.ts: [pasted file]"

**FastAPI analyze router:**
> "FastAPI POST `/api/analyze`. Accepts `{ title, description }`. Pipeline: generate BGE-M3 embedding → query pgvector for top 5 similar resolved issues above 0.6 cosine threshold → build LLM prompt with that context → call LiteLLM → parse JSON response → store embedding back to Supabase issues table. If LLM fails, return a fallback object with `confidence_score: 0.5` — don't 500. Model is `groq/llama-3.3-70b-versatile`."

**Debugging the LiteLLM 403:**
> "LiteLLM is returning 403 on every completion() call. The error has a `cf-ray` header. GET requests to the same base URL work fine (I can list models). Only POST fails. This is from a Mumbai IP. Is this a Cloudflare WAF rule blocking POST requests from certain regions? What are my options — is there a way to route around it or do I need to switch providers entirely?"

---

### Frontend Development

**Client dashboard:**
> "Client dashboard page. Server component. Shows: stat cards (open issues, in progress, resolved), their sites as cards with status dot + open issue count, their recent issues as a list with status/severity badges. Dark theme matching pixel-future.com — use the `glass` utility class I already have in globals.css. Skeleton loading states. Here are my TypeScript types: [pasted types/index.ts]"

**AI Insights panel (after seeing first draft):**
> "The AI panel looks fine but the draft response textarea isn't connected to anything. I need a 'Copy to response' button that takes the `draft_response` string and puts it into the manager's reply textarea below. The reply textarea is in a sibling component `IssueManagementPanel` — how do I lift that state? Show me the prop threading."

**Issue timeline component:**
> "Timeline component. Array of `TimelineEvent` objects — each has `event_type`, `old_value`, `new_value`, `content`, `author`, `created_at`. Different visual treatment per type: `status_changed` shows badge transition (old → new), `response_added` looks like a chat bubble distinct from system events, `created` shows issue details. Relative timestamps. Animate in on mount with staggered fade. Here's the TimelineEvent type: [pasted]"

---

### Refactoring

**Supabase client consolidation:**
> "I've got Supabase client instantiation scattered across 11 API routes — some use the anon key, some use the service role key, none of them handle the cookie pattern consistently. Consolidate to two exports in `lib/supabase/server.ts`: a standard client (uses session cookies, respects RLS) and a service client (service role key, bypasses RLS). Show me the factory functions and one example API route updated to use them. Don't change any response shapes."

**Notification system — replaced polling with Realtime:**
> "I have a setInterval polling `/api/notifications` every 5 seconds. Replace it with Supabase Realtime. I want a channel scoped to `notifications:${userId}` that listens for INSERT events and updates the bell badge count. Show me the hook with proper channel cleanup on unmount. Here's the current polling implementation: [pasted useNotifications.ts]"

---

### Production Readiness

**Security audit prompt:**
> "Audit these API routes for auth gaps. Specifically: (1) any PATCH/POST/DELETE that trusts the JWT role claim without re-fetching from the DB, (2) any GET where a client could read another client's data by guessing a UUID, (3) any place the service role key could end up client-side. Here are all 11 routes: [pasted files]"

**CI/CD setup:**
> "GitHub Actions workflow for this repo. On every push: install deps, run `tsc --noEmit`, run `npm audit --audit-level=high`, run `next build`. Fail fast on any step. Also give me the Dockerfile for the FastAPI service — python:3.11-slim, non-root user, production deps only."

---

## AI Reflection

### Successful Outputs

These were generated correctly on the first pass and used with no meaningful changes:

- **Complete TypeScript type definitions** (`lib/types/index.ts`) — all interfaces for User, Site, Issue, TimelineEvent, Notification generated in one prompt. Used as-is across the entire codebase. Every subsequent component and API route used these exact types, and the AI never invented field names.
- **FastAPI service structure** — clean separation between `routers/`, `services/`, and `models/` from the first prompt. The folder structure, dependency injection pattern, and Pydantic schemas were all correct.
- **API route patterns** — consistent error handling and auth validation across all 11 routes. The pattern of `createServerClient → getUser → role check → DB operation → return JSON` was generated once and held across every route without drift.
- **RLS policies for single-table access** — policies scoping clients to their own sites and issues were correct and tested immediately.
- **shadcn/ui component integration** — all shadcn components installed and themed correctly from the first AI-generated setup prompt.
- **Supabase Realtime subscription** (`useNotifications.ts`) — the channel subscription, INSERT handler, and cleanup on unmount were all generated correctly.

### Rejected Outputs

These were generated by AI but discarded entirely and rewritten manually:

- **The initial middleware pattern** — AI generated a `middleware.ts` file using the Supabase `@supabase/auth-helpers-nextjs` package, which is deprecated in Next.js 16. The entire file was discarded. The replacement `proxy.ts` using `@supabase/ssr` with the new `createServerClient` API was written from scratch after reading the current Supabase documentation.
- **The first LLM service implementation** — AI generated a direct OpenAI SDK call (`openai.chat.completions.create`) rather than using LiteLLM. This was discarded because it locked the service to a single provider. Replaced with `litellm.completion()` which is provider-agnostic.
- **The first notification component** — AI generated a polling-based notification system using `setInterval` to query `/api/notifications` every 5 seconds. This was discarded as architecturally wrong — polling when Supabase Realtime provides WebSocket push. The Realtime subscription approach was used instead.
- **The first pgvector index** — AI generated `CREATE INDEX ... USING ivfflat (embedding vector_l2_ops)`. Discarded because the similarity function uses cosine similarity, which requires `vector_cosine_ops`. Using `vector_l2_ops` with a cosine query would have returned incorrect results silently.

### Manual Corrections

These were generated by AI but required targeted fixes before they worked:

**Supabase SSR cookie handling** — The generated server client read cookies using `cookies()` from `next/headers` directly, which is correct for Server Components but not for API routes in Next.js 16. Fixed by passing the request object and reading `request.cookies` instead.

**LiteLLM model string format** — LiteLLM requires provider-prefixed model strings (`groq/llama-3.3-70b-versatile`, not `llama-3.3-70b-versatile`). The generated code used the unprefixed name and silently fell through to the default provider. Fixed by updating the `GROQ_MODEL` environment variable format.

**BGE-M3 response format** — The HuggingFace Inference API returns nested arrays for BGE-M3 (`[[0.1, 0.2, ...]]` not `[0.1, 0.2, ...]`). The generated embedding service expected a flat array and crashed on the first call. Mean-pooling logic to handle the nested format was added manually.

**Attachment name silently dropped on submit** — The AI generated the multi-step issue creation form with a file picker on Step 2 and correctly displayed the selected filename in the review step. However, the generated `handleSubmit` function did not include `attachment_name` in the POST body — the file was selected in state but never sent to the API. The issue was created without any attachment data despite the UI showing it as attached. Fixed by adding `...(attachment && { attachment_name: attachment.name })` to the submit payload. Also updated the issue detail page attachment display condition from `attachment_url` to `attachment_url || attachment_name` so the filename renders correctly without a storage URL.

**Client comment capability missing from issue detail** — The AI generated the client issue detail page as fully read-only — it showed the timeline but provided no way for the client to add follow-up information. The `respond` API route was generated as manager-only (`role !== 'manager'` hard check), blocking clients entirely. Fixed by: (1) creating a `ClientCommentForm` component that posts to the respond endpoint and calls `router.refresh()` to update the timeline, (2) updating the API route to allow both roles — managers produce `response_added` events with status change and notification, clients produce `comment_added` events with an ownership check enforced at the API level.

**RLS cross-table policies** — Two RLS policies that joined `issues` to `sites` to check `client_id` triggered infinite recursion during evaluation. Rewritten to use subqueries with explicit table aliases to break the recursion.

**Cloudflare WAF block** — The primary LLM endpoint blocked all POST requests from the Mumbai region with a 403. Diagnosed by testing: GET `/models` returned 200, POST `/v1/chat/completions` returned 403 with a `cf-ray` header regardless of API key. Confirmed as an IP-level WAF rule, not an auth issue. Resolved by switching to Groq via LiteLLM — two environment variable changes, zero code changes. This incident validated the LiteLLM provider-agnostic architecture decision before it was needed in production.

**Build cache corruption** — The `.next/` cache became corrupted during a dev-to-build transition, causing the production build to fail with stale module references. Resolved by clearing `.next/` before every production build. Documented as standard practice.

### Lessons Learned

**Structured sequential sections prevent context drift.** Each of the eight sections was prompted as a complete, self-contained unit. The AI output was confirmed working before the next section was started. This meant errors stayed isolated to one section and never cascaded.

**Define all types before writing any code.** Providing complete TypeScript interfaces in Section 1 meant the AI never invented field names in later sections. Every component, API route, and service used identical naming from the start.

**LiteLLM's provider abstraction has real production value.** The Cloudflare block happened during development, not as a hypothetical. Switching providers took two environment variable changes and zero code changes. This is the correct architecture for any system that calls an external LLM.

**AI-generated security code must be reviewed by a human.** The AI produces syntactically correct RLS policies that can have logical gaps — the cross-table recursion issue would not have been caught by TypeScript or a linter. Security logic needs manual testing against actual edge cases.

**Rejected output is faster than corrected output.** For the middleware, polling notifications, and wrong vector index — recognising that the approach was fundamentally wrong and discarding the output entirely was faster than trying to patch it. The correct pattern was clearer after seeing what the AI got wrong.

**AI handles structure better than it handles current library APIs.** Folder structure, separation of concerns, TypeScript interfaces, and error handling patterns were all generated correctly. Current SDK APIs (Supabase SSR, LiteLLM model strings, HuggingFace response shapes) required verification against live documentation.

---

## AI Efficiency

| Metric                                       | Value                        |
|----------------------------------------------|------------------------------|
| Total prompts used                           | ~52                          |
| Total development turns (prompt + response exchanges) | ~180               |
| Average turns per section                    | ~22                          |
| Sections completed without rework            | 6 of 8                       |
| Sections requiring a full rewrite            | 1 (middleware / auth)        |
| AI-generated code as percentage of codebase  | ~85%                         |
| Code requiring manual correction             | ~12%                         |
| Code rejected and rewritten from scratch     | ~3%                          |
| Estimated time saved vs manual development   | 65–70%                       |
| Estimated total build time                   | ~9 hours                     |

---

## AI Features Built Into the Product

Beyond using AI tools to build the project, the product itself uses AI for every issue submitted:

**Endpoint:** `POST /api/ai/analyze` (Next.js proxy → FastAPI on port 8000)

**Full pipeline:**
```
Issue text (title + description)
  → BGE-M3 embedding via HuggingFace Inference API (1024-dimensional, unit-normalized)
  → pgvector ivfflat similarity search (top 5 resolved/closed issues, threshold 0.60)
  → RAG context assembled from similar issues
  → LLM call via LiteLLM → groq/llama-3.3-70b-versatile
  → Structured JSON validated and parsed
  → Embedding stored to pgvector for future RAG lookups
```

**Output fields:**

| Field                  | Description                                          |
|------------------------|------------------------------------------------------|
| `suggested_severity`   | low / medium / high / critical                       |
| `suggested_category`   | bug / feedback / suggestion / improvement            |
| `summary`              | 2–3 sentence issue summary                           |
| `recommended_actions`  | Ordered resolution steps                             |
| `draft_response`       | Ready-to-send manager reply                          |
| `similar_issues`       | Top matching resolved issues from pgvector with similarity scores |
| `confidence_score`     | 0.0–1.0 model confidence                             |

**Surfaced at two points in the product:**

1. **Issue creation (client side)** — AI suggests severity and category before the client submits, reducing misclassification
2. **Manager issue detail** — Full AI Insights panel with re-analyze button, copy-to-response action, and similar issues list for context

**Multi-provider architecture:**
LiteLLM routes all LLM calls through a single `completion()` interface. Switching providers (e.g. from Groq to Cerebras, Cohere, or OpenRouter) requires changing one environment variable. No application code changes. This architecture directly supports the multi-provider requirement and enables automatic failover in production.

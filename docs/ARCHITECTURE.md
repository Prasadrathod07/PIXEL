# Architecture — Pixel Issue Tracker

## System Overview

```
Browser
   │
   ▼
Next.js 16 (web/)
Frontend + API Routes — Port 3000
   │
   ├──► Supabase
   │    PostgreSQL + pgvector + Auth + Realtime
   │
   └──► Python FastAPI (ai-service/) — Port 8000
             │
             ├──► HuggingFace Inference API (BGE-M3 embeddings)
             ├──► Supabase pgvector (similarity search)
             └──► Groq via LiteLLM (llama-3.3-70b-versatile)
```

## Key Technical Decisions

### Next.js API Routes as the backend layer

The assessment explicitly lists Next.js API Routes as an acceptable backend. For this scope, co-locating API logic with the frontend eliminates an entire service, simplifies deployment, and shares TypeScript types across the full stack. A separate Express or NestJS server would add operational overhead with no meaningful architectural benefit at this scale.

The AI service is the deliberate exception — it runs as a separate Python process because the Python ML ecosystem (HuggingFace, LiteLLM, numpy) is significantly more mature than its JavaScript equivalents, and keeping it separate means the core application continues working if the AI service goes down.

### Supabase over standalone PostgreSQL

Supabase provides four things in one managed service: PostgreSQL, authentication with JWT, Row Level Security, and Realtime subscriptions. Each of these would require separate configuration and maintenance if self-hosted. The free tier handles this application with room to scale.

### pgvector over a standalone vector database

The embedding store lives inside the existing Supabase PostgreSQL instance. A standalone vector database like Pinecone or self-hosted FAISS requires additional infrastructure, separate backups, and rebuild logic on service restart. At the scale of hundreds to low thousands of issues, pgvector with an ivfflat index delivers identical query performance with zero additional operational overhead. The ivfflat index uses `lists = 100`, appropriate for this data volume.

### LiteLLM for LLM routing

LiteLLM provides a provider-agnostic interface over every major LLM provider using a single `completion()` call. This decision proved its value during development: the primary LLM endpoint was blocked by Cloudflare WAF, and switching providers required changing two environment variables and zero lines of application code. In production this architecture supports automatic failover, cost routing, and provider diversity without any application changes.

### BGE-M3 for embeddings

BGE-M3 (BAAI/bge-m3) was chosen over OpenAI `text-embedding-3-small` (1536d) and Ada-002 (1536d) for two reasons: it produces 1024-dimensional vectors (smaller index, faster similarity queries) and it has stronger retrieval performance on technical support text — the domain closest to issue descriptions. The tradeoff is HuggingFace Inference API latency (~300–500ms per call) vs OpenAI's API (~100ms). For an async background pipeline where the user isn't blocked, this is acceptable. Accessed via HuggingFace Inference API — no local GPU required, no model hosting overhead.

## Database Design

### Schema

```
users
  id uuid PK | email text UNIQUE | name text
  role text CHECK (client | manager)
  avatar_url text | created_at | updated_at

sites
  id uuid PK | name text | url text
  status text CHECK (online | down | degraded | unknown)
  last_checked timestamptz | client_id uuid FK→users

issues
  id uuid PK | title text | description text
  type text CHECK (bug | feedback | suggestion | improvement)
  severity text CHECK (low | medium | high | critical)
  status text CHECK (open | in_review | in_progress |
                     waiting_for_client | resolved | closed)
  site_id uuid FK→sites | created_by uuid FK→users
  assigned_to uuid FK→users
  attachment_url text | attachment_name text
  ai_summary text | ai_suggested_severity text
  ai_suggested_category text | ai_recommended_actions text
  ai_draft_response text | ai_similar_issues jsonb
  embedding vector(1024)       ← pgvector column
  created_at | updated_at

timeline_events
  id uuid PK | issue_id uuid FK→issues
  event_type text CHECK (created | status_changed |
    severity_changed | comment_added | response_added |
    resolved | closed | attachment_added | ai_analyzed)
  old_value text | new_value text | content text
  author_id uuid FK→users | created_at

notifications
  id uuid PK | user_id uuid FK→users
  issue_id uuid FK→issues | type text
  message text | read boolean DEFAULT false | created_at
```

### Schema Design Decisions

**Embedding stored on the issues table, not a separate table.** Each issue has exactly one embedding, so there is no normalization benefit to separating them. Keeping the embedding on the row eliminates a join on the hot path (every RAG lookup). The tradeoff is a wider row — acceptable at this data volume.

**`ai_similar_issues` stored as `jsonb`, not a foreign-key join table.** Similar issues are a snapshot computed at analysis time, not a live relational link. If a similar issue is later deleted or re-categorized, the snapshot should remain unchanged — it records what the model saw, not the current state of those issues. A join table would require cascade logic and drift over time.

**TEXT with CHECK constraints, not PostgreSQL enums, for status and severity.** ENUMs in PostgreSQL require `ALTER TYPE` to add values, which can lock the table. TEXT + CHECK gives the same validation with simpler migrations. TypeScript union types in `lib/types/index.ts` provide compile-time safety at the application layer.

**`timeline_events` is append-only.** No UPDATE or DELETE operations are permitted on this table by design. It is the audit log — immutability is a security property, not just a convention. RLS policies block all non-insert mutations.

### Row Level Security

RLS is enabled on all five tables. Clients can only read their own sites and issues. Clients can only insert issues where `created_by = auth.uid()`. Managers can read and update everything. Timeline events are readable only if the user has access to the parent issue. Notifications are fully scoped to `user_id = auth.uid()`.

The service role key bypasses RLS and is used exclusively in server-side API routes for operations that require cross-user access — for example, creating a notification for a client when a manager resolves their issue.

One RLS pitfall encountered during development: policies that query another table to determine access can cause infinite recursion in PostgreSQL's policy evaluator. The `timeline_events` policy initially checked `issues` which checked `sites` which checked `users`, creating a cycle. Fixed by flattening to direct `auth.uid()` comparisons and subqueries with explicit aliases.

### Authorization — Two Independent Layers

**Application layer (proxy.ts):** Redirects unauthenticated requests to `/login`. Blocks non-managers from `/manager/*` routes. This prevents IDOR attacks where a client guesses a manager URL — but it is not the security boundary.

**Database layer (RLS):** Enforces data isolation at the query level, independent of the application layer. A bug in application-level auth cannot expose another client's data — RLS is the final guard. Even with a direct Supabase client and a valid JWT, a client cannot read another client's issues because PostgreSQL rejects the query at row level.

The reason both layers exist: application auth handles UX (redirects, role routing) and is fast to implement; RLS handles data safety and is the guarantee that matters. Relying on only the application layer means a single auth bug exposes all customer data. RLS makes that category of bug impossible.

### Vector Similarity Search Function

```sql
create or replace function match_issues(
  query_embedding vector(1024),
  match_threshold float default 0.60,
  match_count int default 5,
  exclude_issue_id uuid default null
)
returns table (id, title, severity, status, similarity)
```

Returns resolved and closed issues above the cosine similarity threshold. Used as RAG context for the LLM analysis.

### Performance Indexes

| Index | Serves |
|-------|--------|
| `idx_sites_client_id` | Client dashboard — fetch all sites for the logged-in client |
| `idx_issues_created_by` | Client issue list — all issues belonging to one client |
| `idx_issues_site_id` | Site detail page — all issues for a specific site |
| `idx_issues_status` + `idx_issues_severity` | Manager dashboard filters — filter by status or severity across all issues |
| `idx_issues_created_at DESC` | Default sort — most recent issues first on all list views |
| `idx_timeline_issue_id, created_at ASC` | Issue detail — fetch full timeline for one issue in chronological order |
| `idx_notifications_user_id` | Notification bell — unread count for current user |
| `idx_notifications_user_id_read` (composite) | Mark-as-read — update unread notifications for a specific user |
| `idx_issues_embedding` (ivfflat, vector_cosine_ops, lists=100) | RAG similarity search — approximate nearest neighbour over 1024-dimensional cosine space |

The ivfflat `lists=100` value is calibrated for the expected data size: the rule of thumb is `sqrt(n_vectors)` lists. At 10,000 issues, `lists=100` gives a good recall/speed tradeoff with ~10 probes per query. Beyond ~1M rows, increase `lists` proportionally or switch to HNSW for better recall.

## AI Pipeline — Complete Flow

```
1. Issue text received (title + description combined)
2. BGE-M3 embedding via HuggingFace Inference API
   → 1024-dimensional vector, unit-normalized
3. pgvector similarity search
   → top 5 resolved/closed issues above 0.60 threshold
4. RAG context assembled from similar issues
   → titles, severities, resolution summaries
5. LLM call via LiteLLM
   → groq/llama-3.3-70b-versatile
   → structured JSON output enforced in system prompt
6. Response validated and parsed
   → suggested_severity, suggested_category, summary,
      recommended_actions, draft_response, confidence_score
7. Embedding stored to pgvector
   → available for future similarity searches
```

## Authentication Flow

```
1. User submits credentials
2. Supabase Auth validates → issues JWT
3. JWT stored in HTTP-only session cookie
4. proxy.ts reads cookie on every request
5. Role fetched from public.users
6. Route protection applied:
   unauthenticated → /login
   client at /manager/* → /dashboard
   manager at / → /manager/dashboard
7. RLS enforces data access at DB level
   independent of application guards
```

## Realtime Notification Flow

```
1. Manager resolves issue
2. PATCH /api/issues/:id — status = resolved
3. API creates notification row in Supabase
4. Supabase Realtime broadcasts INSERT event
   on channel notifications:{userId}
5. useNotifications hook receives payload instantly
6. Bell badge increments without page refresh
7. Browser Notification API fires if permission granted
```

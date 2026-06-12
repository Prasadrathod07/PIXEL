-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ═══════════════════════════════════
-- USERS TABLE
-- ═══════════════════════════════════
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role text not null check (role in ('client', 'manager')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════
-- SITES TABLE
-- ═══════════════════════════════════
create table public.sites (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  url text not null,
  status text not null default 'unknown' check (status in ('online', 'down', 'degraded', 'unknown')),
  last_checked timestamptz default now(),
  client_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════
-- ISSUES TABLE (with pgvector)
-- ═══════════════════════════════════
create table public.issues (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  type text not null check (type in ('bug', 'feedback', 'suggestion', 'improvement')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_review', 'in_progress', 'waiting_for_client', 'resolved', 'closed')),
  site_id uuid not null references public.sites(id) on delete cascade,
  created_by uuid not null references public.users(id),
  assigned_to uuid references public.users(id),
  attachment_url text,
  attachment_name text,
  ai_summary text,
  ai_suggested_severity text check (ai_suggested_severity in ('low', 'medium', 'high', 'critical')),
  ai_suggested_category text check (ai_suggested_category in ('bug', 'feedback', 'suggestion', 'improvement')),
  ai_recommended_actions text,
  ai_draft_response text,
  ai_similar_issues jsonb default '[]'::jsonb,
  embedding vector(1024),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════
-- TIMELINE EVENTS TABLE
-- ═══════════════════════════════════
create table public.timeline_events (
  id uuid primary key default uuid_generate_v4(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  event_type text not null check (event_type in (
    'created', 'status_changed', 'severity_changed',
    'comment_added', 'response_added', 'resolved',
    'closed', 'attachment_added', 'ai_analyzed'
  )),
  old_value text,
  new_value text,
  content text,
  author_id uuid not null references public.users(id),
  created_at timestamptz default now()
);

-- ═══════════════════════════════════
-- NOTIFICATIONS TABLE
-- ═══════════════════════════════════
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  issue_id uuid references public.issues(id) on delete set null,
  type text not null default 'info',
  message text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════
create index idx_sites_client_id on public.sites(client_id);
create index idx_issues_site_id on public.issues(site_id);
create index idx_issues_created_by on public.issues(created_by);
create index idx_issues_status on public.issues(status);
create index idx_issues_severity on public.issues(severity);
create index idx_issues_created_at on public.issues(created_at desc);
create index idx_timeline_issue_id on public.timeline_events(issue_id);
create index idx_timeline_created_at on public.timeline_events(created_at desc);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read on public.notifications(user_id, read);
create index idx_issues_embedding on public.issues using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ═══════════════════════════════════
-- VECTOR SIMILARITY SEARCH FUNCTION
-- ═══════════════════════════════════
create or replace function match_issues(
  query_embedding vector(1024),
  match_threshold float default 0.7,
  match_count int default 5,
  exclude_issue_id uuid default null
)
returns table (
  id uuid,
  title text,
  description text,
  severity text,
  status text,
  type text,
  ai_summary text,
  ai_draft_response text,
  similarity float
)
language sql stable
as $$
  select
    i.id,
    i.title,
    i.description,
    i.severity,
    i.status,
    i.type,
    i.ai_summary,
    i.ai_draft_response,
    1 - (i.embedding <=> query_embedding) as similarity
  from public.issues i
  where
    i.embedding is not null
    and 1 - (i.embedding <=> query_embedding) > match_threshold
    and (exclude_issue_id is null or i.id != exclude_issue_id)
    and i.status in ('resolved', 'closed')
  order by i.embedding <=> query_embedding
  limit match_count;
$$;

-- ═══════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════
alter table public.users enable row level security;
alter table public.sites enable row level security;
alter table public.issues enable row level security;
alter table public.timeline_events enable row level security;
alter table public.notifications enable row level security;

-- Users policies
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_select_managers_see_all" on public.users
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Sites policies
create policy "sites_clients_see_own" on public.sites
  for select using (
    client_id = auth.uid() or
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

create policy "sites_managers_all" on public.sites
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

-- Issues policies
create policy "issues_clients_see_own" on public.issues
  for select using (
    created_by = auth.uid() or
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

create policy "issues_clients_create" on public.issues
  for insert with check (created_by = auth.uid());

create policy "issues_managers_update" on public.issues
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

-- Timeline policies
create policy "timeline_select_related" on public.timeline_events
  for select using (
    exists (
      select 1 from public.issues i
      where i.id = issue_id and (
        i.created_by = auth.uid() or
        exists (
          select 1 from public.users u
          where u.id = auth.uid() and u.role = 'manager'
        )
      )
    )
  );

create policy "timeline_insert_authenticated" on public.timeline_events
  for insert with check (auth.uid() is not null);

-- Notifications policies
create policy "notifications_own" on public.notifications
  for all using (user_id = auth.uid());

-- ═══════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGERS
-- ═══════════════════════════════════
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sites_updated_at before update on public.sites
  for each row execute function update_updated_at();

create trigger issues_updated_at before update on public.issues
  for each row execute function update_updated_at();

create trigger users_updated_at before update on public.users
  for each row execute function update_updated_at();

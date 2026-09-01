-- ─────────────────────────────────────────────────────────────────────────────
-- Navia Academy — Content store (write path)
--
-- Content is owned by contributors through the backend admin API (apps/backend,
-- ContentHandler) and lives here in Supabase (PostgreSQL). PUBLIC READS NEVER
-- HIT THESE TABLES — release content is published from `data/json` into
-- immutable R2/CDN bundles (content-hashed + short-TTL manifest) via
-- `bun run publish-data`. This keeps the free tiers safe: Vercel/Cloudflare only
-- ever serve CDN objects, and the database is never queried on the read path.
--
-- Auth is Supabase Auth (auth.users). created_by / reviewer_id reference
-- auth.users(id). Run 001_user_data.sql (backend) BEFORE this file.
--
-- Run this file in the Supabase SQL editor (or via `supabase db push`).
-- ─────────────────────────────────────────────────────────────────────────────

-- Status lifecycle: draft → review → published | rejected (→ archived).
create type public.content_status as enum ('draft', 'review', 'published', 'rejected', 'archived');

-- One row = one editable unit.
--   kind 'list'   → the source JSON was an array; payload is a single item and
--                   the publish job concatenates items in (ref, pos) order.
--   kind 'object' → the source JSON was a standalone object/array that ships
--                   as-is (curriculum parts, tutor parts, app-level config).
-- `ref` mirrors the source file under apps/media/data/json (e.g. 'hsk/hsk1').
create table public.content_items (
  lang      text                 not null,   -- 'zh' | 'de' | 'en' | 'ja' | 'app'
  domain    text                 not null,   -- 'vocabulary', 'grammar', 'curriculum', 'achievements', …
  ref       text                 not null default '',   -- source file ref
  pos       integer              not null default 0,    -- order within a list file
  id        text                 not null,   -- stable id (item id, or part id for object rows)
  kind      text                 not null default 'list' check (kind in ('list', 'object')),
  payload   jsonb                not null,
  status    public.content_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  reviewer_id uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz         not null default now(),
  updated_at timestamptz         not null default now(),
  primary key (lang, domain, id)
);

create index content_items_status_idx        on public.content_items (status);
create index content_items_lang_domain_idx   on public.content_items (lang, domain, ref, pos);
create index content_items_reviewed_idx      on public.content_items (reviewed_at desc);

-- Reviewer gate: Supabase app_metadata.content_role = 'reviewer'.
create or replace function public.is_content_reviewer()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'content_role', '') = 'reviewer';
$$;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.content_items enable row level security;

-- Anyone (including anon) can read published content. Public reads are served
-- from CDN, but this keeps PostgREST usable for previews/drafts-by-id.
create policy "content_read_published" on public.content_items
  for select using (status = 'published');

-- Authenticated contributors can only touch their own drafts.
create policy "content_contributor_insert_draft" on public.content_items
  for insert with check (
    status = 'draft'
    and created_by = auth.uid()
  );

create policy "content_contributor_read_own" on public.content_items
  for select using (
    created_by = auth.uid() and status in ('draft', 'review')
  );

create policy "content_contributor_update_own_draft" on public.content_items
  for update using (
    created_by = auth.uid()
    and status in ('draft', 'review')
  ) with check (
    created_by = auth.uid()
    and status in ('draft', 'review')
  );

create policy "content_contributor_delete_own_draft" on public.content_items
  for delete using (
    created_by = auth.uid()
    and status = 'draft'
  );

-- Reviewers/admins see everything non-archived.
create policy "content_reviewer_read_all" on public.content_items
  for select using (public.is_content_reviewer() and status <> 'archived');

-- Reviewers promote rows to final status.
create policy "content_reviewer_review" on public.content_items
  for update using (public.is_content_reviewer())
  with check (public.is_content_reviewer() and status in ('published', 'rejected'));

-- Contributor may resubmit their own rejected item as a new draft/review.
create policy "content_contributor_reopen_rejected" on public.content_items
  for update using (
    created_by = auth.uid()
    and status = 'rejected'
  ) with check (
    created_by = auth.uid()
    and status in ('draft', 'review')
  );

-- Grant the publish job read access. It uses the anon key and RLS already
-- allows SELECT on published rows; ensure the anon role at least has usage.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.content_items to authenticated;
grant select on public.content_items to anon;

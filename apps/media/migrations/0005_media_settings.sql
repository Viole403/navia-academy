-- Media pipeline settings — dashboard-editable provider / engine selection.
--
-- CLI, GitHub Actions, and the dashboard all read these (via the service-role
-- key) and apply them when the corresponding env var is NOT explicitly set
-- (env wins). Known keys:
--   image_provider  → openai | gemini | deepai | cloudflare
--   tts_engine      → edge | google | azure
--
-- Storing the active provider here lets the Media Studio dashboard switch
-- provider without touching env vars on every machine/runner.

create table if not exists public.media_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Internal pipeline settings — no public/anonymous access.
alter table public.media_settings enable row level security;

create policy "media_settings_service_role_all"
  on public.media_settings
  for all
  to service_role
  using (true)
  with check (true);

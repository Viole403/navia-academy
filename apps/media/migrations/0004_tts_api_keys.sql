-- TTS (speech synthesis) API key store — centralized key pool for the media pipeline.
--
-- Supports multiple providers (google | azure) with MULTIPLE keys per provider.
-- The pipeline reads keys from here and does round-robin rotation, marking a
-- key `cooldown_until` when it hits a 429 / quota limit so the next key is used
-- (no batch failure). Edge TTS is free and keyless — no rows needed for it.
--
-- Editable centrally in the Media Studio dashboard; CLI, GitHub Actions, and
-- the dashboard API routes all use the service-role key to read/write this table.
--
-- RLS: keys are SECRETS. Only the service-role key can read them; anon/public
-- must never see them.

create table if not exists public.tts_api_keys (
  id uuid primary key default gen_random_uuid(),
  provider text not null,            -- google | azure
  name text not null,                -- label, e.g. "google-main", "azure-prod"
  api_key text not null,
  region text,                       -- azure region override (e.g. eastasia); google ignores
  enabled boolean not null default true,
  cooldown_until timestamptz,        -- set when the key hit a 429/quota limit; skipped until this passes
  last_error text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tts_api_keys_provider_name_key unique (provider, name)
);

-- Never expose keys via anon/authenticated roles.
alter table public.tts_api_keys enable row level security;

create policy "tts_api_keys_service_role_all"
  on public.tts_api_keys
  for all
  to service_role
  using (true)
  with check (true);

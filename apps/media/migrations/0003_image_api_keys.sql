-- Image generation API key store — centralized key pool for the media pipeline.
--
-- Supports multiple providers (openai | gemini | cloudflare | deepai) with
-- MULTIPLE keys per provider. The pipeline reads keys from here and does
-- round-robin rotation, marking a key `cooldown_until` when it hits a
-- 429 / quota limit so the next key is used (no batch failure).
--
-- Editable centrally (Media Studio dashboard later); CLI, GitHub Actions, and
-- the dashboard API routes all use the service-role key to read/write this table
-- (the dashboard UI is itself gated by a shared secret in the media app).
--
-- RLS: keys are SECRETS. Only the service-role key can read them; anon/public
-- must never see them.

create table if not exists public.image_api_keys (
  id uuid primary key default gen_random_uuid(),
  provider text not null,            -- openai | gemini | cloudflare | deepai
  name text not null,                -- label, e.g. "cf-main", "gemini-tutor"
  api_key text not null,
  api_base_url text,                 -- optional per-key override (OpenAI-compatible aggregators, etc.)
  model text,                        -- optional per-key model override (falls back to env default)
  cf_account_id text,                -- required for provider=cloudflare
  enabled boolean not null default true,
  cooldown_until timestamptz,        -- set when the key hit a 429/quota limit; skipped until this passes
  last_error text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint image_api_keys_provider_name_key unique (provider, name)
);

-- Never expose keys via anon/authenticated roles.
alter table public.image_api_keys enable row level security;

create policy "image_api_keys_service_role_all"
  on public.image_api_keys
  for all
  to service_role
  using (true)
  with check (true);

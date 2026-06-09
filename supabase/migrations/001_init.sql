create table if not exists public.sessions (
  id text primary key,
  label text not null,
  contract_session_id text not null unique,
  contract_address text,
  join_token_hash text not null,
  dashboard_token_hash text,
  active boolean not null default true,
  mode text not null default 'indoor',
  origin_lat_e7 integer,
  origin_lng_e7 integer,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.devices (
  id text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  device_address text not null,
  pubkey_hash text not null,
  alias text not null,
  device_class text not null,
  device_label text,
  browser_name text,
  os_name text,
  screen_w integer,
  screen_h integer,
  touch boolean,
  online boolean not null default true,
  status text not null default 'joining',
  latest_lat_e7 integer,
  latest_lng_e7 integer,
  latest_accuracy_cm integer,
  latest_risk_score integer not null default 0,
  latest_risk_flags integer not null default 0,
  latest_batch_sequence bigint,
  latest_tx_hash text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(session_id, device_address)
);

create table if not exists public.telemetry_events (
  id bigserial primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  device_id text not null references public.devices(id) on delete cascade,
  seq bigint not null,
  client_timestamp_ms bigint not null,
  received_at timestamptz not null default now(),

  payload_hash text not null,
  leaf_hash text not null,
  signature text not null,
  recovered_address text not null,

  lat_e7 integer,
  lng_e7 integer,
  accuracy_cm integer,
  speed_cm_s integer,
  heading_deg integer,

  accel_peak_mg integer,
  shake_count integer not null default 0,
  battery_pct integer,
  charging boolean,

  payload jsonb not null,
  risk_score integer not null default 0,
  risk_flags integer not null default 0,
  risk_reason text,

  batch_sequence bigint,
  tx_hash text,
  committed_at timestamptz,

  unique(session_id, device_id, seq),
  unique(session_id, payload_hash)
);

create table if not exists public.telemetry_batches (
  id bigserial primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  sequence bigint not null,
  merkle_root text not null,
  sample_count integer not null,
  max_risk_score integer not null default 0,
  combined_flags integer not null default 0,
  first_client_timestamp_ms bigint not null,
  last_client_timestamp_ms bigint not null,

  status text not null default 'pending',
  tx_hash text,
  block_number bigint,
  contract_address text,
  submitted_at timestamptz,
  committed_at timestamptz,
  error text,

  unique(session_id, sequence)
);

create table if not exists public.merkle_proofs (
  event_id bigint primary key references public.telemetry_events(id) on delete cascade,
  session_id text not null,
  batch_sequence bigint not null,
  leaf_index integer not null,
  proof jsonb not null
);

create table if not exists public.incidents (
  id bigserial primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  device_id text references public.devices(id) on delete set null,
  telemetry_event_id bigint references public.telemetry_events(id) on delete set null,
  severity text not null,
  risk_score integer not null,
  risk_flags integer not null,
  title text not null,
  summary text not null,
  agent_summary text,
  status text not null default 'open',
  evidence_hash text not null,
  tx_hash text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.agent_actions (
  id bigserial primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  incident_id bigint references public.incidents(id) on delete cascade,
  agent_name text not null,
  action_type text not null,
  input jsonb not null,
  output jsonb,
  status text not null default 'proposed',
  tx_hash text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create table if not exists public.chain_outbox (
  id bigserial primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  kind text not null,
  payload jsonb not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  tx_hash text,
  error text,
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  processed_at timestamptz
);

create index if not exists telemetry_events_unbatched_idx
  on public.telemetry_events(session_id, id)
  where batch_sequence is null;

create index if not exists telemetry_events_session_time_idx
  on public.telemetry_events(session_id, received_at desc);

create index if not exists devices_session_online_idx
  on public.devices(session_id, online, last_seen_at desc);

create index if not exists incidents_session_time_idx
  on public.incidents(session_id, created_at desc);

create index if not exists chain_outbox_status_idx
  on public.chain_outbox(status, created_at);

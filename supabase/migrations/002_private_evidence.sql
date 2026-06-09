alter table public.sessions
  add column if not exists shipment_commitment text,
  add column if not exists route_policy_commitment text,
  add column if not exists destination_commitment text,
  add column if not exists join_token text,
  add column if not exists delivery_status text not null default 'not_arrived';

alter table public.telemetry_events
  add column if not exists evidence_version integer not null default 1,
  add column if not exists shipment_commitment text,
  add column if not exists device_pseudonym text,
  add column if not exists payload_salt text,
  add column if not exists payload_commitment text,
  add column if not exists ciphertext text,
  add column if not exists ciphertext_hash text,
  add column if not exists encrypted_payload jsonb,
  add column if not exists previous_event_hash text,
  add column if not exists event_hash text,
  add column if not exists risk_commitment text,
  add column if not exists legacy_leaf_hash text,
  add column if not exists event_class text not null default 'normal',
  add column if not exists temperature_c_x10 integer,
  add column if not exists shock_energy numeric,
  add column if not exists jerk_peak numeric,
  add column if not exists route_deviation_m numeric,
  add column if not exists stop_dwell_seconds integer,
  add column if not exists exposure_degree_minutes numeric;

alter table public.telemetry_batches
  add column if not exists shipment_commitment text,
  add column if not exists route_policy_commitment text,
  add column if not exists data_availability_hash text,
  add column if not exists time_bucket bigint;

create table if not exists public.shipments (
  id text primary key,
  session_id text references public.sessions(id) on delete cascade,
  shipment_commitment text not null unique,
  product_type text not null default 'pharma',
  status text not null default 'in_transit',
  origin_label text not null default 'Origin warehouse',
  destination_label text not null default 'Destination receiver',
  origin_lat_e7 integer,
  origin_lng_e7 integer,
  destination_lat_e7 integer,
  destination_lng_e7 integer,
  route_policy_commitment text not null,
  destination_commitment text not null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table if not exists public.custody_events (
  id bigserial primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  shipment_id text references public.shipments(id) on delete cascade,
  telemetry_event_id bigint references public.telemetry_events(id) on delete set null,
  type text not null,
  actor_commitment text,
  device_pseudonym text,
  event_hash text not null,
  batch_sequence bigint,
  tx_hash text,
  timestamp_ms bigint not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.route_policies (
  id text primary key,
  shipment_id text not null references public.shipments(id) on delete cascade,
  route_policy_commitment text not null,
  allowed_h3_cells_encrypted text,
  checkpoints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_receipts (
  id bigserial primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  shipment_id text references public.shipments(id) on delete cascade,
  batch_sequence bigint not null,
  tx_hash text,
  merkle_root text not null,
  selected_event_ids bigint[] not null default '{}',
  verification_status text not null default 'unverified',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telemetry_events_event_hash_idx
  on public.telemetry_events(event_hash);

create index if not exists telemetry_events_commitments_idx
  on public.telemetry_events(session_id, shipment_commitment, event_class, received_at desc);

create index if not exists custody_events_session_time_idx
  on public.custody_events(session_id, timestamp_ms desc);

create index if not exists evidence_receipts_session_batch_idx
  on public.evidence_receipts(session_id, batch_sequence);

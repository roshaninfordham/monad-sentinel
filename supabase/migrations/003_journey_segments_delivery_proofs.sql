create table if not exists public.journey_segments (
  id bigserial primary key,
  shipment_id text not null,
  session_id text references public.sessions(id) on delete cascade,
  segment_type text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  centroid_lat_e7 integer,
  centroid_lng_e7 integer,
  encrypted_geometry jsonb,
  geometry_commitment text not null,
  authorized boolean not null default true,
  evidence_batch_start bigint,
  evidence_batch_end bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_proofs (
  id bigserial primary key,
  shipment_id text not null,
  session_id text references public.sessions(id) on delete cascade,
  destination_commitment text not null,
  receiver_commitment text,
  arrival_time timestamptz,
  dwell_seconds integer,
  final_condition_hash text,
  final_batch_sequence bigint,
  receiver_signature text,
  tx_hash text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists journey_segments_shipment_time_idx
  on public.journey_segments(shipment_id, started_at desc);

create index if not exists journey_segments_session_time_idx
  on public.journey_segments(session_id, started_at desc);

create index if not exists delivery_proofs_shipment_time_idx
  on public.delivery_proofs(shipment_id, created_at desc);

create index if not exists delivery_proofs_session_time_idx
  on public.delivery_proofs(session_id, created_at desc);

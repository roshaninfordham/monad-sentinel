import Link from "next/link";
import { ArrowLeft, LockKeyhole, Route, ShieldCheck, Thermometer, Zap } from "lucide-react";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
import { JourneyMap, type JourneyMapData, type LngLat } from "@/components/journey/JourneyMap";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ shipmentId: string }>;
};

function short(value?: string | null) {
  if (!value) return "pending";
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function fmtTime(value?: string | number | null) {
  if (!value) return "pending";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const DEMO_PLANNED_ROUTE: LngLat[] = [
  [-74.1745, 40.6895],
  [-74.146, 40.708],
  [-74.094, 40.731],
  [-74.047, 40.721],
  [-74.006, 40.7128]
];

const DEMO_ACTUAL_ROUTE: LngLat[] = [
  [-74.1745, 40.6895],
  [-74.145, 40.709],
  [-74.116, 40.704],
  [-74.092, 40.733],
  [-74.047, 40.721],
  [-74.006, 40.7128]
];

const DEMO_DEVIATION_ROUTE: LngLat[] = [
  [-74.145, 40.709],
  [-74.116, 40.704],
  [-74.092, 40.733]
];

function e7ToLngLat(latE7?: number | null, lngE7?: number | null): LngLat | null {
  if (!Number.isFinite(latE7) || !Number.isFinite(lngE7)) return null;
  return [Number(lngE7) / 10_000_000, Number(latE7) / 10_000_000];
}

function destinationGeofence(center: LngLat, meters = 420, steps = 36): LngLat[] {
  const lat = center[1];
  const latRadius = meters / 111_320;
  const lngRadius = meters / (111_320 * Math.max(0.18, Math.cos((lat * Math.PI) / 180)));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / steps;
    return [center[0] + Math.cos(angle) * lngRadius, center[1] + Math.sin(angle) * latRadius] as LngLat;
  });
}

function routePoint(route: LngLat[], fraction: number): LngLat {
  if (!route.length) return DEMO_ACTUAL_ROUTE[0];
  const index = Math.min(route.length - 1, Math.max(0, Math.round((route.length - 1) * fraction)));
  return route[index];
}

function buildJourneyMapData(input: {
  shipment: Record<string, unknown> | null;
  telemetryRows: Array<Record<string, unknown>>;
  batchRows: Array<Record<string, unknown>>;
  segmentRows: Array<Record<string, unknown>>;
}): JourneyMapData {
  const telemetryCoords = input.telemetryRows
    .map((row) => e7ToLngLat(row.lat_e7 as number | null, row.lng_e7 as number | null))
    .filter((coord): coord is LngLat => Boolean(coord));
  const actualRoute = telemetryCoords.length >= 2 ? telemetryCoords : DEMO_ACTUAL_ROUTE;

  const origin = e7ToLngLat(input.shipment?.origin_lat_e7 as number | null, input.shipment?.origin_lng_e7 as number | null);
  const destination = e7ToLngLat(input.shipment?.destination_lat_e7 as number | null, input.shipment?.destination_lng_e7 as number | null);
  const plannedRoute = origin && destination ? [origin, routePoint(actualRoute, 0.45), destination] : DEMO_PLANNED_ROUTE;
  const destinationCenter = destination ?? plannedRoute.at(-1) ?? DEMO_PLANNED_ROUTE.at(-1)!;

  const riskCoords = input.telemetryRows
    .filter((row) => Number(row.risk_score ?? 0) >= 30 || String(row.event_class ?? "") !== "normal")
    .map((row) => e7ToLngLat(row.lat_e7 as number | null, row.lng_e7 as number | null))
    .filter((coord): coord is LngLat => Boolean(coord));
  const deviationRoute = riskCoords.length >= 2 ? riskCoords : telemetryCoords.length >= 2 ? [] : DEMO_DEVIATION_ROUTE;

  const segmentStops = input.segmentRows
    .filter((segment) => String(segment.segment_type ?? "") === "stop" || Number(segment.duration_seconds ?? 0) > 0)
    .map((segment, index) => {
      const coordinates = e7ToLngLat(segment.centroid_lat_e7 as number | null, segment.centroid_lng_e7 as number | null);
      if (!coordinates) return null;
      return {
        id: `segment-${segment.id ?? index}`,
        label: String(segment.segment_type ?? "Stop"),
        coordinates,
        dwellMinutes: Math.max(1, Math.round(Number(segment.duration_seconds ?? 180) / 60)),
        authorized: Boolean(segment.authorized ?? true)
      };
    })
    .filter((stop): stop is JourneyMapData["stops"][number] => Boolean(stop));

  const stops: JourneyMapData["stops"] = segmentStops.length
    ? segmentStops
    : [
        {
          id: "demo-authorized-stop",
          label: "Authorized checkpoint dwell",
          coordinates: routePoint(actualRoute, 0.34),
          dwellMinutes: 18,
          authorized: true
        },
        {
          id: "demo-unauthorized-stop",
          label: "Unauthorized dwell near deviation",
          coordinates: routePoint(deviationRoute.length ? deviationRoute : actualRoute, 0.55),
          dwellMinutes: 7,
          authorized: false
        }
      ];

  const telemetryIncidents = input.telemetryRows
    .filter((row) => Number(row.risk_score ?? 0) >= 30 || String(row.event_class ?? "") !== "normal")
    .map((row, index) => {
      const coordinates = e7ToLngLat(row.lat_e7 as number | null, row.lng_e7 as number | null);
      if (!coordinates) return null;
      const eventClass = String(row.event_class ?? "");
      const kind = eventClass.includes("cold") || Number(row.temperature_c_x10 ?? 0) > 80 ? "temperature" : "shock";
      return {
        id: `telemetry-incident-${row.id ?? index}`,
        label: kind === "temperature" ? "Temperature excursion" : "Shock event",
        kind,
        coordinates,
        severity: Number(row.risk_score ?? 0) >= 70 ? "critical" : "watch"
      } satisfies JourneyMapData["incidents"][number];
    })
    .filter((incident): incident is JourneyMapData["incidents"][number] => Boolean(incident));

  const incidents: JourneyMapData["incidents"] = telemetryIncidents.length
    ? telemetryIncidents
    : [
        {
          id: "demo-shock",
          label: "Shock event",
          kind: "shock",
          coordinates: routePoint(deviationRoute.length ? deviationRoute : actualRoute, 0.45),
          severity: "watch"
        },
        {
          id: "demo-temperature",
          label: "Temperature excursion",
          kind: "temperature",
          coordinates: routePoint(actualRoute, 0.72),
          severity: "critical"
        }
      ];

  const batchAnchors: JourneyMapData["batchAnchors"] = input.batchRows.length
    ? input.batchRows.map((batch, index) => ({
        id: `batch-${batch.id ?? batch.sequence ?? index}`,
        label: `Batch #${batch.sequence ?? index + 1}`,
        sequence: Number(batch.sequence ?? index + 1),
        coordinates: routePoint(actualRoute, input.batchRows.length === 1 ? 0.78 : index / Math.max(1, input.batchRows.length - 1)),
        status: String(batch.status ?? "pending")
      }))
    : [
        { id: "demo-batch-1", label: "Batch #1", sequence: 1, coordinates: routePoint(actualRoute, 0.2), status: "committed" },
        { id: "demo-batch-2", label: "Batch #2", sequence: 2, coordinates: routePoint(actualRoute, 0.58), status: "committed" },
        { id: "demo-batch-3", label: "Batch #3", sequence: 3, coordinates: routePoint(actualRoute, 0.86), status: "pending" }
      ];

  return {
    plannedRoute,
    actualRoute,
    deviationRoute,
    destinationGeofence: destinationGeofence(destinationCenter),
    stops,
    incidents,
    batchAnchors,
    currentPosition: actualRoute.at(-1) ?? destinationCenter
  };
}

export default async function ShipmentJourneyPage({ params }: PageProps) {
  const { shipmentId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: shipment } = supabase
    ? await supabase.from("shipments").select("*").or(`id.eq.${shipmentId},session_id.eq.${shipmentId}`).limit(1).maybeSingle()
    : { data: null };
  const sessionId = shipment?.session_id ?? shipmentId;
  const [events, incidents, batches, telemetry, segments, deliveryProofs] = supabase
    ? await Promise.all([
        supabase.from("custody_events").select("*").eq("session_id", sessionId).order("timestamp_ms", { ascending: true }).limit(80),
        supabase.from("incidents").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(10),
        supabase.from("telemetry_batches").select("*").eq("session_id", sessionId).order("sequence", { ascending: true }).limit(20),
        supabase
          .from("telemetry_events")
          .select("id,lat_e7,lng_e7,risk_score,event_class,temperature_c_x10,batch_sequence,received_at")
          .eq("session_id", sessionId)
          .not("lat_e7", "is", null)
          .not("lng_e7", "is", null)
          .order("received_at", { ascending: true })
          .limit(240),
        supabase.from("journey_segments").select("*").eq("shipment_id", shipment?.id ?? `ship_${sessionId.slice(2)}`).order("started_at", { ascending: true }).limit(80),
        supabase.from("delivery_proofs").select("*").eq("shipment_id", shipment?.id ?? `ship_${sessionId.slice(2)}`).order("created_at", { ascending: false }).limit(1)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const custodyEvents = events.data ?? [];
  const incidentRows = incidents.data ?? [];
  const batchRows = batches.data ?? [];
  const telemetryRows = telemetry.data ?? [];
  const segmentRows = segments.data ?? [];
  const latestDeliveryProof = deliveryProofs.data?.[0];
  const latestBatch = batchRows[batchRows.length - 1];
  const mapData = buildJourneyMapData({ shipment, telemetryRows, batchRows, segmentRows });

  const deliverySteps = [
    ["Destination geofence", shipment?.status === "delivered" || shipment?.status === "verified"],
    ["Dwell threshold", Boolean(latestDeliveryProof?.dwell_seconds) || shipment?.status === "delivered" || shipment?.status === "verified"],
    ["Receiver handoff", Boolean(latestDeliveryProof?.receiver_signature) || shipment?.status === "verified"],
    ["Final condition check", !incidentRows.some((incident) => Number(incident.risk_score) >= 90)],
    ["Evidence committed", Boolean(latestDeliveryProof?.tx_hash) || Boolean(latestBatch?.tx_hash)]
  ] as const;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)]">
      <BackgroundGrid />
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <Link href={`/dashboard/${sessionId}`} className="inline-flex items-center gap-2 text-sm text-[var(--monad-purple-soft)]">
          <ArrowLeft size={16} /> Back to command center
        </Link>

        <header className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="command-panel rounded-lg p-6">
            <div className="mb-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              <span>Authorized Journey View</span>
              <span className="text-[var(--verified-green)]">Encrypted evidence store</span>
            </div>
            <h1 className="text-4xl font-semibold">Shipment Journey</h1>
            <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)]">
              Raw telemetry stays private. This page represents the authorized view that can decrypt route, condition, stop, and custody evidence while
              auditors verify selected events against Monad commitments.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Shipment commitment", short(shipment?.shipment_commitment)],
                ["Route policy", short(shipment?.route_policy_commitment)],
                ["Destination commitment", short(shipment?.destination_commitment)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <div className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-secondary)]">{label}</div>
                  <div className="hash mt-1 text-sm">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="command-panel min-w-72 rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--verified-green)]">
              <ShieldCheck size={17} /> Evidence State
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">Delivery Proof Policy</div>
            <div className="mt-4 space-y-3">
              {deliverySteps.map(([label, done]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className={done ? "text-[var(--verified-green)]" : "text-[var(--muted)]"}>{done ? "Ready" : "Pending"}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="command-panel rounded-lg p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Route size={17} className="text-[var(--chain-blue)]" /> Planned vs Actual Route
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Demo route corridor with private exact coordinates</div>
              </div>
              <span className="rounded-full border border-[rgba(37,243,132,.28)] px-3 py-1 text-xs text-[var(--verified-green)]">Authorized</span>
            </div>
            <JourneyMap data={mapData} />
          </div>

          <div className="grid gap-4">
            <div className="command-panel rounded-lg p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Thermometer size={17} className="text-[var(--warning-amber)]" /> Cold-Chain Exposure
              </div>
              <div className="space-y-3">
                {[42, 45, 51, 72, 86, 78, 62, 48].map((value, index) => (
                  <div key={index} className="grid grid-cols-[44px_1fr_42px] items-center gap-2 text-xs">
                    <span className="text-[var(--text-secondary)]">T+{index * 5}m</span>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className={`h-2 rounded-full ${value > 80 ? "bg-[var(--tamper-red)]" : "bg-[var(--verified-green)]"}`} style={{ width: `${Math.min(100, value)}%` }} />
                    </div>
                    <span className={value > 80 ? "text-[var(--tamper-red)]" : "text-[var(--text-secondary)]"}>{(value / 10).toFixed(1)}C</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="command-panel rounded-lg p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Zap size={17} className="text-[var(--chain-blue)]" /> Shock Classification
              </div>
              <div className="grid gap-2">
                {[
                  ["Road bump", "shock only", "No custody breach"],
                  ["Mishandling", "repeated shock", "Inspect packaging"],
                  ["Likely theft", "shock + route deviation + dwell", "Quarantine handoff"]
                ].map(([label, signal, action]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{signal}</span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">{action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="command-panel rounded-lg p-5">
            <div className="mb-4 text-sm font-semibold">Custody Timeline</div>
            <div className="space-y-3">
              {custodyEvents.length ? (
                custodyEvents.map((event) => (
                  <div key={event.id} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{event.type}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{fmtTime(Number(event.timestamp_ms))}</span>
                    </div>
                    <div className="hash mt-1 text-xs text-[var(--text-secondary)]">{short(event.event_hash)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-white/10 p-5 text-sm text-[var(--text-secondary)]">No custody events yet.</div>
              )}
            </div>
          </div>
          <div className="command-panel rounded-lg p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <LockKeyhole size={17} className="text-[var(--monad-purple-soft)]" /> Evidence Batches
            </div>
            <div className="space-y-3">
              {batchRows.length ? (
                batchRows.map((batch) => (
                  <div key={batch.id ?? batch.sequence} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">Batch #{batch.sequence}</span>
                      <span className="text-xs text-[var(--verified-green)]">{batch.status}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-[var(--text-secondary)]">
                      <span>Root: <span className="hash">{short(batch.merkle_root)}</span></span>
                      <span>Tx: <span className="hash">{short(batch.tx_hash)}</span></span>
                      <span>Samples: {batch.sample_count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-white/10 p-5 text-sm text-[var(--text-secondary)]">No evidence batch committed yet.</div>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

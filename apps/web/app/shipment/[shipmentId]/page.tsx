import Link from "next/link";
import { ArrowLeft, CheckCircle2, LockKeyhole, MapPin, PackageCheck, Route, ShieldCheck, Thermometer, Zap } from "lucide-react";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
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

export default async function ShipmentJourneyPage({ params }: PageProps) {
  const { shipmentId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: shipment } = supabase
    ? await supabase.from("shipments").select("*").or(`id.eq.${shipmentId},session_id.eq.${shipmentId}`).limit(1).maybeSingle()
    : { data: null };
  const sessionId = shipment?.session_id ?? shipmentId;
  const [events, incidents, batches] = supabase
    ? await Promise.all([
        supabase.from("custody_events").select("*").eq("session_id", sessionId).order("timestamp_ms", { ascending: true }).limit(80),
        supabase.from("incidents").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(10),
        supabase.from("telemetry_batches").select("*").eq("session_id", sessionId).order("sequence", { ascending: true }).limit(20)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const custodyEvents = events.data ?? [];
  const incidentRows = incidents.data ?? [];
  const batchRows = batches.data ?? [];
  const latestBatch = batchRows[batchRows.length - 1];

  const deliverySteps = [
    ["Destination geofence", shipment?.status === "delivered" || shipment?.status === "verified"],
    ["Dwell threshold", shipment?.status === "delivered" || shipment?.status === "verified"],
    ["Receiver handoff", shipment?.status === "verified"],
    ["Final condition check", !incidentRows.some((incident) => Number(incident.risk_score) >= 90)],
    ["Evidence committed", Boolean(latestBatch?.tx_hash)]
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
            <div className="relative h-[420px] overflow-hidden rounded-lg border border-white/10 bg-[#07030d]">
              <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(131,110,249,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(131,110,249,.14)_1px,transparent_1px)] [background-size:42px_42px]" />
              <div className="absolute left-[11%] top-[62%] grid size-14 place-items-center rounded-full border border-[var(--verified-green)] bg-[rgba(37,243,132,.12)] text-[var(--verified-green)]">
                <MapPin size={22} />
              </div>
              <div className="absolute right-[12%] top-[24%] grid size-14 place-items-center rounded-full border border-[var(--monad-purple)] bg-[rgba(131,110,249,.14)] text-[var(--monad-purple-soft)]">
                <PackageCheck size={22} />
              </div>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 500" preserveAspectRatio="none">
                <path d="M120 330 C 260 260, 360 400, 500 270 S 740 140, 875 135" fill="none" stroke="rgba(131,110,249,.35)" strokeWidth="28" strokeLinecap="round" />
                <path d="M120 330 C 260 260, 360 400, 500 270 S 740 140, 875 135" fill="none" stroke="#25F384" strokeWidth="4" strokeDasharray="10 12" strokeLinecap="round" />
                <path d="M520 265 C 560 330, 625 345, 680 310" fill="none" stroke="#FF3B5C" strokeWidth="5" strokeLinecap="round" />
              </svg>
              <div className="absolute bottom-4 left-4 right-4 grid gap-3 md:grid-cols-3">
                {[
                  ["Stop detection", "30m radius · 180s dwell"],
                  ["Route privacy", "H3/corridor commitments"],
                  ["Public chain", "No raw GPS or product ID"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-black/40 p-3 backdrop-blur">
                    <div className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-secondary)]">{label}</div>
                    <div className="mt-1 text-sm">{value}</div>
                  </div>
                ))}
              </div>
            </div>
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

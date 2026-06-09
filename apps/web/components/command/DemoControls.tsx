"use client";

import {
  Activity,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flag,
  MapPin,
  Navigation,
  PackageX,
  Play,
  RotateCcw,
  Route,
  ShieldAlert,
  Thermometer,
  Users
} from "lucide-react";
import { getAppUrl } from "@/lib/session";
import { SoundEngine } from "@/lib/sound/SoundEngine";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function DemoControls({ sessionId }: { sessionId: string }) {
  const spawnSimulatedDevices = useSentinelStore((state) => state.spawnSimulatedDevices);
  const triggerRandomTamper = useSentinelStore((state) => state.triggerRandomTamper);
  const triggerColdChainBreach = useSentinelStore((state) => state.triggerColdChainBreach);
  const triggerScenario = useSentinelStore((state) => state.triggerScenario);
  const simulateMovement = useSentinelStore((state) => state.simulateMovement);
  const simulateRouteDeviation = useSentinelStore((state) => state.simulateRouteDeviation);
  const simulateAuthorizedStop = useSentinelStore((state) => state.simulateAuthorizedStop);
  const simulateDeliveryArrival = useSentinelStore((state) => state.simulateDeliveryArrival);
  const commitBatch = useSentinelStore((state) => state.commitBatch);
  const receiveBatch = useSentinelStore((state) => state.receiveBatch);
  const reset = useSentinelStore((state) => state.reset);
  const soundEnabled = useSentinelStore((state) => state.soundEnabled);
  const latestBatch = useSentinelStore((state) => state.batches[0]);

  function spawn() {
    spawnSimulatedDevices(50, sessionId);
    if (soundEnabled) {
      SoundEngine.playJoin();
      window.setTimeout(() => SoundEngine.playSwarmComplete(), 260);
    }
  }

  function tamper() {
    const incident = triggerScenario("theft") ?? triggerRandomTamper();
    if (incident && soundEnabled) SoundEngine.playTamper();
  }

  function movement() {
    simulateMovement(sessionId);
    if (soundEnabled) SoundEngine.playJoin();
  }

  function deviation() {
    const incident = simulateRouteDeviation(sessionId);
    if (incident && soundEnabled) SoundEngine.playTamper();
  }

  function stop() {
    simulateAuthorizedStop(sessionId);
    if (soundEnabled) SoundEngine.playVerified();
  }

  function delivery() {
    simulateDeliveryArrival(sessionId);
    if (soundEnabled) SoundEngine.playSwarmComplete();
  }

  function bump() {
    triggerScenario("bump");
    if (soundEnabled) SoundEngine.playOffline();
  }

  function mishandling() {
    triggerScenario("mishandling");
    if (soundEnabled) SoundEngine.playTamper();
  }

  function coldChain() {
    const incident = triggerColdChainBreach();
    if (incident && soundEnabled) SoundEngine.playTamper();
  }

  async function batch() {
    const response = await fetch("/api/chain/emergency-commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId })
    }).catch(() => null);
    if (!response?.ok) {
      const committed = commitBatch();
      if (committed && soundEnabled) SoundEngine.playBatchCommitted();
      return;
    }
    const body = await response.json().catch(() => null);
    if (!body?.batch) {
      const committed = commitBatch();
      if (committed && soundEnabled) SoundEngine.playBatchCommitted();
      return;
    }
    receiveBatch({
      sequence: Number(body.batch.sequence),
      merkleRoot: body.batch.merkleRoot,
      sampleCount: Number(body.batch.sampleCount),
      maxRiskScore: Number(body.batch.maxRiskScore),
      flags: Number(body.batch.combinedFlags ?? 0),
      txHash: body.batch.txHash,
      status: body.batch.simulated || body.batch.status === "simulated" ? "simulated" : body.batch.status === "verified" ? "verified" : "committed",
      createdAt: Date.now(),
      simulated: Boolean(body.batch.simulated)
    });
  }

  async function copyJoinUrl() {
    let url = `${getAppUrl()}/s/${sessionId}`;
    if (window.location.search.includes("d=")) {
      const body = await fetch(`/api/session/${sessionId}${window.location.search}`)
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);
      if (body?.joinToken) url = `${window.location.origin}/s/${sessionId}?t=${encodeURIComponent(body.joinToken)}`;
    }
    navigator.clipboard.writeText(url);
  }

  function openLatestReceipt() {
    if (!latestBatch) return;
    window.open(`/receipt/${sessionId}/${latestBatch.sequence}`, "_blank", "noopener,noreferrer");
  }

  function openJourney() {
    window.open(`/shipment/${sessionId}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="presenter-actions">
      <button onClick={spawn} className="control-button border-[rgba(37,243,132,.34)] bg-[rgba(37,243,132,.12)] text-[0.78rem] text-[var(--verified-green)]">
        <Users size={16} /> Spawn
      </button>
      <button onClick={movement} className="control-button border-[rgba(76,201,240,.34)] bg-[rgba(76,201,240,.12)] text-[0.78rem] text-[var(--chain-blue)]">
        <Navigation size={16} /> Move
      </button>
      <button onClick={deviation} className="control-button border-[rgba(255,59,92,.34)] bg-[rgba(255,59,92,.13)] text-[0.78rem] text-[var(--tamper-red)]">
        <Route size={16} /> Dev
      </button>
      <button onClick={stop} className="control-button border-[rgba(37,243,132,.34)] bg-[rgba(37,243,132,.12)] text-[0.78rem] text-[var(--verified-green)]">
        <MapPin size={16} /> Stop
      </button>
      <button onClick={delivery} className="control-button border-[rgba(37,243,132,.34)] bg-[rgba(37,243,132,.12)] text-[0.78rem] text-[var(--verified-green)]">
        <CheckCircle2 size={16} /> Drop
      </button>
      <button onClick={bump} className="control-button border-[rgba(76,201,240,.34)] bg-[rgba(76,201,240,.12)] text-[0.78rem] text-[var(--chain-blue)]">
        <Activity size={16} /> Bump
      </button>
      <button onClick={mishandling} className="control-button border-[rgba(255,176,32,.34)] bg-[rgba(255,176,32,.12)] text-[0.78rem] text-[var(--warning-amber)]">
        <PackageX size={16} /> Handle
      </button>
      <button onClick={tamper} className="control-button border-[rgba(255,59,92,.34)] bg-[rgba(255,59,92,.13)] text-[0.78rem] text-[var(--tamper-red)]">
        <ShieldAlert size={16} /> Theft
      </button>
      <button onClick={coldChain} className="control-button border-[rgba(255,176,32,.34)] bg-[rgba(255,176,32,.12)] text-[0.78rem] text-[var(--warning-amber)]">
        <Thermometer size={16} /> Cold
      </button>
      <button onClick={batch} className="control-button border-[rgba(131,110,249,.38)] bg-[rgba(131,110,249,.16)] text-[0.78rem] text-[var(--monad-purple-soft)]">
        <Play size={16} /> Batch
      </button>
      <button onClick={copyJoinUrl} className="control-button text-[0.78rem]">
        <Copy size={16} /> Copy
      </button>
      <button onClick={openLatestReceipt} disabled={!latestBatch} className="control-button text-[0.78rem] disabled:cursor-not-allowed disabled:opacity-40">
        <ExternalLink size={16} /> Proof
      </button>
      <button onClick={openJourney} className="control-button text-[0.78rem]">
        <Flag size={16} /> Route
      </button>
      <button onClick={reset} className="control-button text-[0.78rem]">
        <RotateCcw size={16} /> Reset
      </button>
    </div>
  );
}

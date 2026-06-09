"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Fingerprint,
  Loader2,
  MapPin,
  Radio,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Waves,
  Zap
} from "lucide-react";
import { keccak256, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hashPayload, telemetryTypedData, TelemetryPayload } from "@monad-sentinel/shared";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
import {
  BrowserSensorHints,
  getSensorEnvironmentHints,
  requestLocationSensor,
  requestMotionPermission,
  SensorPermissionState
} from "@/lib/sensors/browserSensors";
import { SoundEngine } from "@/lib/sound/SoundEngine";

type StatusTone = "muted" | "pending" | "success" | "warning";

const configuredRetentionMinutes = Number(process.env.NEXT_PUBLIC_DEMO_DATA_RETENTION_MINUTES ?? 30);
const DEMO_RETENTION_MINUTES =
  Number.isFinite(configuredRetentionMinutes) && configuredRetentionMinutes > 0 ? Math.round(configuredRetentionMinutes) : 30;

function randomPrivateKey(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function inferDeviceClass() {
  if (typeof window === "undefined") return "unknown";
  const touch = navigator.maxTouchPoints > 0;
  const minSide = Math.min(window.innerWidth, window.innerHeight);
  if (touch && minSide >= 700) return "tablet";
  if (touch) return "mobile";
  return "desktop";
}

function permissionLabel(state: SensorPermissionState) {
  switch (state) {
    case "not_requested":
      return "Not requested";
    case "requesting":
      return "Requesting";
    case "granted":
      return "Granted";
    case "denied":
      return "Denied";
    case "fallback":
      return "Fallback active";
  }
}

function permissionTone(state: SensorPermissionState): StatusTone {
  if (state === "granted") return "success";
  if (state === "fallback" || state === "denied") return "warning";
  if (state === "requesting") return "pending";
  return "muted";
}

function toneClass(tone: StatusTone) {
  if (tone === "success") return "border-[rgba(37,243,132,.28)] bg-[rgba(37,243,132,.08)] text-[var(--verified-green)]";
  if (tone === "warning") return "border-[rgba(255,176,32,.28)] bg-[rgba(255,176,32,.08)] text-[var(--warning-amber)]";
  if (tone === "pending") return "border-[rgba(76,201,240,.28)] bg-[rgba(76,201,240,.08)] text-[var(--chain-blue)]";
  return "border-white/10 bg-white/[0.03] text-[var(--text-secondary)]";
}

function PermissionBadge({ state }: { state: SensorPermissionState }) {
  const tone = permissionTone(state);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass(tone)}`}>
      {state === "requesting" ? <Loader2 className="size-3 animate-spin" /> : null}
      {permissionLabel(state)}
    </span>
  );
}

function PermissionStep({
  step,
  title,
  description,
  state,
  action,
  actionLabel,
  disabled,
  reason,
  fallback,
  fallbackLabel
}: {
  step: string;
  title: string;
  description: string;
  state: SensorPermissionState;
  action: () => void;
  actionLabel: string;
  disabled?: boolean;
  reason?: string | null;
  fallback?: () => void;
  fallbackLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--monad-purple-soft)]">Step {step}</div>
          <div className="mt-1 text-base font-semibold text-[var(--text-primary)]">{title}</div>
        </div>
        <PermissionBadge state={state} />
      </div>
      <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{description}</p>
      {reason ? (
        <div className="mt-3 flex gap-2 rounded-md border border-[rgba(255,176,32,.22)] bg-[rgba(255,176,32,.07)] p-2 text-xs text-[var(--warning-amber)]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{reason}</span>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={action}
          disabled={disabled || state === "requesting" || state === "granted"}
          className="min-h-10 flex-1 rounded-md border border-[rgba(131,110,249,.36)] bg-[rgba(131,110,249,.14)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[rgba(169,139,255,.7)] hover:bg-[rgba(131,110,249,.22)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {state === "requesting" ? "Requesting..." : state === "granted" ? "Granted" : actionLabel}
        </button>
        {fallback && fallbackLabel ? (
          <button
            onClick={fallback}
            disabled={state === "requesting" || state === "granted"}
            className="min-h-10 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(255,255,255,.22)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {fallbackLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RetentionNotice() {
  return (
    <div className="rounded-md border border-[rgba(37,243,132,.22)] bg-[rgba(37,243,132,.07)] p-3 text-left text-xs leading-5 text-[var(--text-secondary)]">
      <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--verified-green)]">
        <Clock3 className="size-3.5" />
        Temporary demo data
      </div>
      Sensor packets are encrypted for the live demo and automatically eligible for deletion within {DEMO_RETENTION_MINUTES} minutes of capture.
    </div>
  );
}

function BrowserGuidance({
  hints,
  onOpenBrowser,
  openBrowserStatus
}: {
  hints: BrowserSensorHints | null;
  onOpenBrowser: () => void;
  openBrowserStatus: string | null;
}) {
  if (!hints?.guidance.length && hints?.locationPermission !== "prompt") return null;
  return (
    <div className="rounded-lg border border-[rgba(255,176,32,.24)] bg-[rgba(255,176,32,.07)] p-3 text-left">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--warning-amber)]">
        <AlertTriangle className="size-4" />
        Location prompt checklist
      </div>
      <div className="mt-2 grid gap-1.5 text-xs leading-5 text-[var(--text-secondary)]">
        {hints?.guidance.length
          ? hints.guidance.map((item) => <div key={item}>{item}</div>)
          : <div>Your browser is ready to ask for Location. Tap Enable Location directly from this page.</div>}
        <div>iPhone: Settings {"->"} Privacy & Security {"->"} Location Services {"->"} Safari/Chrome {"->"} allow location and turn on Precise Location.</div>
        <div>Android: Chrome {"->"} site settings {"->"} Location {"->"} Allow, then retry from this page.</div>
      </div>
      {hints?.likelyInAppBrowser ? (
        <button
          onClick={onOpenBrowser}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[rgba(255,176,32,.34)] bg-[rgba(255,176,32,.12)] px-3 py-2 text-sm font-semibold text-[var(--warning-amber)]"
        >
          <ExternalLink className="size-4" />
          Copy link and open in browser
        </button>
      ) : null}
      {openBrowserStatus ? <div className="mt-2 text-xs text-[var(--warning-amber)]">{openBrowserStatus}</div> : null}
    </div>
  );
}

export function SensorContent({ sessionId }: { sessionId: string }) {
  const [joined, setJoined] = useState(false);
  const [beaconActive, setBeaconActive] = useState(false);
  const [locationState, setLocationState] = useState<SensorPermissionState>("not_requested");
  const [motionState, setMotionState] = useState<SensorPermissionState>("not_requested");
  const [signatureState, setSignatureState] = useState<SensorPermissionState>("not_requested");
  const [locationReason, setLocationReason] = useState<string | null>(null);
  const [motionReason, setMotionReason] = useState<string | null>(null);
  const [sensorHints, setSensorHints] = useState<BrowserSensorHints | null>(null);
  const [openBrowserStatus, setOpenBrowserStatus] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [shock, setShock] = useState(false);
  const [batch, setBatch] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [deviceAlias] = useState(() => `Mobile Witness #${Math.floor(Math.random() * 89) + 10}`);
  const account = useMemo(() => privateKeyToAccount(randomPrivateKey()), []);
  const lastShake = useRef(0);
  const seq = useRef(0);
  const previousEventHash = useRef<`0x${string}` | undefined>(undefined);
  const latestPosition = useRef<GeolocationPosition | null>(null);
  const latestAccel = useRef({ x: 0, y: 0, z: 9.8 });
  const locationWatchId = useRef<number | null>(null);
  const deviceId = useMemo(() => keccak256(stringToHex(`${sessionId}:${account.address}`)).slice(0, 18), [sessionId, account.address]);
  const joinToken = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("t") ?? undefined;
  }, []);

  const locationReady = locationState === "granted" || locationState === "fallback";
  const motionReady = motionState === "granted" || motionState === "fallback";
  const canStartBeacon = locationReady && motionReady && !starting;

  function updatePosition(position: GeolocationPosition) {
    latestPosition.current = position;
    setGpsAccuracy(Math.round(position.coords.accuracy));
    setLocationReason(null);
  }

  async function refreshSensorHints() {
    setSensorHints(await getSensorEnvironmentHints());
  }

  async function sendTelemetry(manualAlert = false) {
    seq.current += 1;
    const coords = latestPosition.current?.coords;
    const payload: TelemetryPayload = {
      version: 1,
      sessionId,
      deviceId,
      deviceAddress: account.address,
      seq: seq.current,
      capturedAt: Date.now(),
      latE7: coords ? Math.round(coords.latitude * 1e7) : null,
      lngE7: coords ? Math.round(coords.longitude * 1e7) : null,
      accuracyCm: coords ? Math.round(coords.accuracy * 100) : null,
      altitudeCm: coords?.altitude ? Math.round(coords.altitude * 100) : null,
      speedCmS: coords?.speed ? Math.round(coords.speed * 100) : null,
      headingDeg: coords?.heading ?? null,
      accelX: manualAlert ? 26 : latestAccel.current.x,
      accelY: manualAlert ? 18 : latestAccel.current.y,
      accelZ: manualAlert ? 13 : latestAccel.current.z,
      batteryPct: null,
      charging: null,
      deviceClass: inferDeviceClass(),
      browserHints: {
        platform: navigator.platform,
        touch: navigator.maxTouchPoints > 0,
        screenW: window.screen.width,
        screenH: window.screen.height
      },
      riskFlags: manualAlert ? 128 : 0,
      previousEventHash: previousEventHash.current
    };
    const payloadHash = hashPayload(payload);
    const typed = telemetryTypedData({
      chainId: Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ?? 10143),
      verifyingContract: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined,
      payload,
      payloadHash
    });
    const signature = await account.signTypedData(typed);

    const response = await fetch("/api/telemetry/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        deviceAddress: account.address,
        joinToken,
        events: [{ payload, payloadHash, signature, joinToken, manualAlert, scenario: manualAlert ? "mishandling" : undefined }]
      })
    }).catch(() => undefined);
    const body = await response?.json().catch(() => null);
    const eventHash = body?.accepted?.[0]?.eventHash;
    if (eventHash) previousEventHash.current = eventHash;
  }

  async function join() {
    await SoundEngine.initFromUserGesture();
    await refreshSensorHints();
    setJoined(true);
  }

  async function enableLocation() {
    setLocationState("requesting");
    setLocationReason(null);
    await refreshSensorHints();

    if (locationWatchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }

    const result = await requestLocationSensor(updatePosition, (reason) => {
      setLocationReason(reason);
      setLocationState((current) => (current === "granted" ? current : "denied"));
    });

    if (result.status === "granted") {
      locationWatchId.current = result.watchId;
      setLocationState("granted");
      await refreshSensorHints();
      return;
    }

    setLocationReason(result.reason);
    setLocationState("denied");
    await refreshSensorHints();
  }

  async function enableMotion() {
    setMotionState("requesting");
    setMotionReason(null);
    const result = await requestMotionPermission();
    if (result.status === "granted") {
      setMotionState("granted");
      return;
    }

    setMotionReason(result.reason);
    setMotionState("denied");
  }

  function useIndoorSpatialization() {
    if (locationWatchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
    latestPosition.current = null;
    setGpsAccuracy(null);
    setLocationReason("Indoor demo spatialization is active. No raw GPS will be used.");
    setLocationState("fallback");
  }

  function useManualShockFallback() {
    setMotionReason("Manual shock trigger is active because motion sensors are not available or were denied.");
    setMotionState("fallback");
  }

  function retryPermissions() {
    if (locationWatchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
    latestPosition.current = null;
    setGpsAccuracy(null);
    setLocationReason(null);
    setMotionReason(null);
    if (locationState !== "granted") setLocationState("not_requested");
    if (motionState !== "granted") setMotionState("not_requested");
    refreshSensorHints().catch(() => undefined);
  }

  async function copyAndOpenBrowser() {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
      setOpenBrowserStatus("Link copied. Open Safari or Chrome, paste the link, then tap Enable Location again.");
    } catch {
      setOpenBrowserStatus("Open this same link in Safari or Chrome, then tap Enable Location again.");
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function startBeacon() {
    if (!canStartBeacon) return;
    setStarting(true);
    setSignatureState("requesting");
    try {
      await SoundEngine.initFromUserGesture();
      const payloadHash = keccak256(stringToHex(`${sessionId}:${account.address}:${Date.now()}`));
      await account.signMessage({ message: { raw: payloadHash } });
      setSignatureState("granted");
      setBeaconActive(true);
      await sendTelemetry();
      SoundEngine.playVerified();
    } catch {
      setSignatureState("denied");
    } finally {
      setStarting(false);
    }
  }

  function triggerShock() {
    setShock(true);
    setBatch(null);
    if ("vibrate" in navigator) navigator.vibrate([80, 60, 100]);
    SoundEngine.playTamper();
    sendTelemetry(true).catch(() => undefined);
    window.setTimeout(() => setBatch(Math.floor(Math.random() * 20) + 4), 1200);
    window.setTimeout(() => setShock(false), 1800);
  }

  useEffect(() => {
    if (!beaconActive || motionState !== "granted") return;
    const onMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      const x = accel?.x ?? 0;
      const y = accel?.y ?? 0;
      const z = accel?.z ?? 0;
      latestAccel.current = { x, y, z };
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (magnitude > 24 && Date.now() - lastShake.current > 1400) {
        lastShake.current = Date.now();
        triggerShock();
      }
    };
    window.addEventListener("devicemotion", onMotion, true);
    return () => window.removeEventListener("devicemotion", onMotion, true);
  }, [beaconActive, motionState]);

  useEffect(() => {
    if (!beaconActive) return;
    const id = window.setInterval(() => {
      sendTelemetry().catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(id);
  }, [beaconActive]);

  useEffect(() => {
    return () => {
      if (locationWatchId.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!joined) return;
    refreshSensorHints().catch(() => undefined);
  }, [joined]);

  const status = [
    ["GPS", locationState, MapPin],
    ["Motion", motionState, Zap],
    ["Signature", signatureState, Fingerprint],
    ["Realtime", beaconActive ? "granted" : "not_requested", Radio]
  ] as const;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <BackgroundGrid />
      <section className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8">
        {!joined ? (
          <div className="panel rounded-lg p-6 text-center">
            <div className="mx-auto mb-6 grid size-28 place-items-center rounded-full border border-[rgba(37,243,132,.32)] bg-[rgba(37,243,132,.08)] shadow-[0_0_38px_rgba(37,243,132,.2)]">
              <Smartphone className="size-12 text-[var(--verified-green)]" />
            </div>
            <h1 className="text-3xl font-semibold">Join the Proof-of-Custody Swarm</h1>
            <p className="mt-3 text-[var(--text-secondary)]">Your phone becomes a temporary signed sensor witness.</p>
            <button onClick={join} className="mt-7 w-full rounded-md bg-[var(--verified-green)] px-5 py-4 font-semibold text-black">
              Join Secure Session
            </button>
            <div className="mt-4 text-xs text-[var(--text-secondary)]">No wallet. No tokens. Temporary demo identity.</div>
            <div className="mt-4">
              <RetentionNotice />
            </div>
          </div>
        ) : !beaconActive ? (
          <div className="panel rounded-lg p-5">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full border border-[rgba(131,110,249,.34)] bg-[rgba(131,110,249,.12)]">
                <ShieldAlert className="size-9 text-[var(--monad-purple-soft)]" />
              </div>
              <h1 className="text-2xl font-semibold">Set Up Secure Beacon</h1>
              <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
                Enable sensors from direct taps so your phone can sign real custody evidence for this session.
              </p>
            </div>

            <div className="mb-3 grid gap-3">
              <RetentionNotice />
              <BrowserGuidance hints={sensorHints} onOpenBrowser={copyAndOpenBrowser} openBrowserStatus={openBrowserStatus} />
            </div>

            <div className="grid gap-3">
              <PermissionStep
                step="2"
                title="Enable Location"
                description="Requests Location from this tap, then starts watchPosition updates. If the room blocks GPS, use indoor demo spatialization."
                state={locationState}
                action={enableLocation}
                actionLabel="Enable Location"
                reason={locationReason}
                fallback={useIndoorSpatialization}
                fallbackLabel="Use indoor demo spatialization"
              />
              <PermissionStep
                step="3"
                title="Enable Motion"
                description="Requests motion permission where required, then listens for shock events after the beacon starts."
                state={motionState}
                action={enableMotion}
                actionLabel="Enable Motion"
                reason={motionReason}
                fallback={useManualShockFallback}
                fallbackLabel="Use manual shock fallback"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={retryPermissions}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(255,255,255,.22)] hover:text-[var(--text-primary)]"
              >
                <RotateCcw className="size-4" />
                Retry permissions
              </button>
              <button
                onClick={startBeacon}
                disabled={!canStartBeacon}
                className="inline-flex min-h-11 flex-[1.3] items-center justify-center gap-2 rounded-md bg-[var(--verified-green)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {starting ? <Loader2 className="size-4 animate-spin" /> : <Waves className="size-4" />}
                {starting ? "Starting..." : "Start Secure Beacon"}
              </button>
            </div>

            <div className="mt-4 rounded-md border border-[rgba(76,201,240,.22)] bg-[rgba(76,201,240,.07)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
              Step 1 complete: secure session joined. Start is available after location and motion are granted or explicit fallbacks are active. Demo telemetry expires after {DEMO_RETENTION_MINUTES} minutes.
            </div>
          </div>
        ) : (
          <div className="panel rounded-lg p-5">
            <motion.div
              animate={{ scale: shock ? [1, 1.08, 1] : [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: shock ? 0.35 : 2 }}
              className={`mx-auto grid size-36 place-items-center rounded-full border ${
                shock ? "border-[var(--tamper-red)] bg-[rgba(255,59,92,.14)]" : "border-[var(--verified-green)] bg-[rgba(37,243,132,.1)]"
              }`}
            >
              {shock ? <ShieldAlert className="size-16 text-[var(--tamper-red)]" /> : <CheckCircle2 className="size-16 text-[var(--verified-green)]" />}
            </motion.div>
            <div className="mt-6 text-center">
              <div className="text-2xl font-semibold">{shock ? "Shock event detected" : "Secure Beacon Active"}</div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">
                {deviceAlias} · {inferDeviceClass()}
              </div>
            </div>
            <div className="mt-6 grid gap-2">
              {status.map(([label, state, Icon]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3">
                  <span className="flex items-center gap-2 text-sm">
                    <Icon size={16} /> {label}
                  </span>
                  <span className={toneClass(permissionTone(state)) + " rounded-full border px-2.5 py-1 text-xs font-medium"}>{permissionLabel(state)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-[rgba(131,110,249,.26)] bg-[rgba(131,110,249,.08)] p-3 text-sm text-[var(--text-secondary)]">
              GPS:{" "}
              {locationState === "fallback" ? "indoor demo spatialization" : gpsAccuracy ? `${gpsAccuracy}m accuracy` : "waiting for first fix"} · Evidence:
              encrypted + signed · Proof: {batch ? `queued in demo batch #${batch}` : shock ? "evidence queued" : "batch pending"}
            </div>
            <div className="mt-3 text-center text-xs text-[var(--text-secondary)]">
              Demo sensor data expires automatically after {DEMO_RETENTION_MINUTES} minutes.
            </div>
            <button onClick={triggerShock} className="mt-5 w-full rounded-md bg-[var(--tamper-red)] px-5 py-4 font-semibold text-white">
              Shake or tap to simulate shock event
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

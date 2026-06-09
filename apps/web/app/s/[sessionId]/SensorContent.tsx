"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { keccak256, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CheckCircle2, Fingerprint, MapPin, Radio, ShieldAlert, Smartphone, Zap } from "lucide-react";
import { hashPayload, telemetryTypedData, TelemetryPayload } from "@monad-sentinel/shared";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
import { SoundEngine } from "@/lib/sound/SoundEngine";

type PermissionState = "idle" | "pending" | "active" | "fallback";

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

export function SensorContent({ sessionId }: { sessionId: string }) {
  const [joined, setJoined] = useState(false);
  const [locationState, setLocationState] = useState<PermissionState>("idle");
  const [motionState, setMotionState] = useState<PermissionState>("idle");
  const [signatureState, setSignatureState] = useState<PermissionState>("idle");
  const [tamper, setTamper] = useState(false);
  const [batch, setBatch] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [deviceAlias] = useState(() => `Mobile Witness #${Math.floor(Math.random() * 89) + 10}`);
  const account = useMemo(() => privateKeyToAccount(randomPrivateKey()), []);
  const lastShake = useRef(0);
  const seq = useRef(0);
  const previousEventHash = useRef<`0x${string}` | undefined>(undefined);
  const latestPosition = useRef<GeolocationPosition | null>(null);
  const latestAccel = useRef({ x: 0, y: 0, z: 9.8 });
  const deviceId = useMemo(() => keccak256(stringToHex(`${sessionId}:${account.address}`)).slice(0, 18), [sessionId, account.address]);
  const joinToken = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("t") ?? undefined;
  }, []);

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
      latE7: coords?.latitude ? Math.round(coords.latitude * 1e7) : null,
      lngE7: coords?.longitude ? Math.round(coords.longitude * 1e7) : null,
      accuracyCm: coords?.accuracy ? Math.round(coords.accuracy * 100) : null,
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
    setJoined(true);
    setLocationState("pending");
    setMotionState("pending");
    setSignatureState("pending");

    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          latestPosition.current = position;
          setGpsAccuracy(Math.round(position.coords.accuracy));
          setLocationState("active");
        },
        () => setLocationState("fallback"),
        { enableHighAccuracy: true, maximumAge: 1500, timeout: 5000 }
      );
    } else {
      setLocationState("fallback");
    }

    const motionCtor = DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    try {
      if (typeof motionCtor?.requestPermission === "function") {
        const permission = await motionCtor.requestPermission();
        setMotionState(permission === "granted" ? "active" : "fallback");
      } else {
        setMotionState("active");
      }
    } catch {
      setMotionState("fallback");
    }

    const payloadHash = keccak256(stringToHex(`${sessionId}:${account.address}:${Date.now()}`));
    await account.signMessage({ message: { raw: payloadHash } });
    setSignatureState("active");
    await sendTelemetry();
    SoundEngine.playVerified();
  }

  function triggerTamper() {
    setTamper(true);
    setBatch(null);
    if ("vibrate" in navigator) navigator.vibrate([80, 60, 100]);
    SoundEngine.playTamper();
    sendTelemetry(true).catch(() => undefined);
    window.setTimeout(() => setBatch(Math.floor(Math.random() * 20) + 4), 1200);
    window.setTimeout(() => setTamper(false), 1800);
  }

  useEffect(() => {
    if (!joined) return;
    const onMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      const x = accel?.x ?? 0;
      const y = accel?.y ?? 0;
      const z = accel?.z ?? 0;
      latestAccel.current = { x, y, z };
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (magnitude > 24 && Date.now() - lastShake.current > 1400) {
        lastShake.current = Date.now();
        triggerTamper();
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [joined]);

  useEffect(() => {
    if (!joined) return;
    const id = window.setInterval(() => {
      sendTelemetry().catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(id);
  }, [joined]);

  const status = [
    ["GPS", locationState, MapPin],
    ["Motion", motionState, Zap],
    ["Signature", signatureState, Fingerprint],
    ["Realtime", joined ? "active" : "idle", Radio]
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
          </div>
        ) : (
          <div className="panel rounded-lg p-5">
            <motion.div
              animate={{ scale: tamper ? [1, 1.08, 1] : [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: tamper ? 0.35 : 2 }}
              className={`mx-auto grid size-36 place-items-center rounded-full border ${
                tamper ? "border-[var(--tamper-red)] bg-[rgba(255,59,92,.14)]" : "border-[var(--verified-green)] bg-[rgba(37,243,132,.1)]"
              }`}
            >
              {tamper ? <ShieldAlert className="size-16 text-[var(--tamper-red)]" /> : <CheckCircle2 className="size-16 text-[var(--verified-green)]" />}
            </motion.div>
            <div className="mt-6 text-center">
              <div className="text-2xl font-semibold">{tamper ? "Tamper event detected" : "Secure Beacon Active"}</div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">
                {deviceAlias} · {inferDeviceClass()}
              </div>
            </div>
            <div className="mt-6 grid gap-2">
              {status.map(([label, state, Icon]) => (
                <div key={label} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-3">
                  <span className="flex items-center gap-2 text-sm">
                    <Icon size={16} /> {label}
                  </span>
                  <span className={state === "active" ? "text-[var(--verified-green)]" : state === "fallback" ? "text-[var(--warning-amber)]" : "text-[var(--text-secondary)]"}>
                    {state === "active" ? "Active" : state === "fallback" ? "Fallback" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-[rgba(131,110,249,.26)] bg-[rgba(131,110,249,.08)] p-3 text-sm text-[var(--text-secondary)]">
              GPS: {gpsAccuracy ? `${gpsAccuracy}m accuracy` : "indoor demo spatialization"} · Evidence: encrypted + signed · Monad:{" "}
              {batch ? `Verified in batch #${batch}` : tamper ? "Evidence queued" : "Batch pending"}
            </div>
            <button onClick={triggerTamper} className="mt-5 w-full rounded-md bg-[var(--tamper-red)] px-5 py-4 font-semibold text-white">
              Shake to simulate cargo tamper
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

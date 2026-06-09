"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Boxes, Fingerprint, QrCode, ShieldCheck } from "lucide-react";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
import { StartSessionButton } from "@/components/command/StartSessionButton";

const MonadOrbitalHero = dynamic(() => import("@/components/three/MonadOrbitalHero").then((mod) => mod.MonadOrbitalHero), {
  ssr: false
});

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <BackgroundGrid />
      <section className="relative z-10 grid min-h-screen grid-cols-1 items-center gap-8 px-6 py-8 lg:grid-cols-[1fr_1.08fr] lg:px-12">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(131,110,249,.32)] bg-[rgba(131,110,249,.12)] px-4 py-2 text-sm text-[var(--monad-purple-soft)]">
            <ShieldCheck size={16} /> Sentinel Command OS
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal md:text-7xl">
            Stop trusting GPS. Prove custody.
          </h1>
          <p className="mt-5 max-w-2xl text-xl leading-8 text-[var(--text-secondary)]">
            Monad Sentinel turns phones, trackers, and IoT devices into signed custody witnesses. A live agentic command
            center detects tamper events, verifies telemetry, and commits evidence batches to Monad.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <StartSessionButton />
            <Link href="/receipt/demo/1" className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-3 transition hover:border-[var(--monad-purple)]">
              View Demo Receipt <QrCode size={18} />
            </Link>
          </div>
          <div className="panel mt-8 max-w-2xl rounded-lg p-4">
            <div className="grid grid-cols-5 items-center gap-2 text-center text-xs text-[var(--text-secondary)] md:text-sm">
              {["Observed", "Signed", "Batched", "Committed", "Verified"].map((stage, index) => (
                <div key={stage} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-3">
                  <span className={index === 4 ? "text-[var(--verified-green)]" : "text-[var(--monad-purple-soft)]"}>{stage}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["QR Sensor Swarm", QrCode],
              ["Signed Telemetry", Fingerprint],
              ["Merkle Evidence", Boxes],
              ["Monad Testnet", ShieldCheck]
            ].map(([label, Icon]) => {
              const IconComponent = Icon as typeof QrCode;
              return (
                <div key={label as string} className="panel rounded-lg p-3 text-sm text-[var(--text-secondary)]">
                  <IconComponent className="mb-2 text-[var(--monad-purple-soft)]" size={18} />
                  {label as string}
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel h-[58vh] min-h-[420px] overflow-hidden rounded-lg">
          <MonadOrbitalHero />
        </div>
      </section>
    </main>
  );
}

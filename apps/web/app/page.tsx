"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, Boxes, Fingerprint, PackageSearch, QrCode, RouteOff, ShieldCheck, Truck } from "lucide-react";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
import { ProblemImpactStrip } from "@/components/command/ProblemImpactStrip";
import { StartSessionButton } from "@/components/command/StartSessionButton";

const MonadOrbitalHero = dynamic(() => import("@/components/three/MonadOrbitalHero").then((mod) => mod.MonadOrbitalHero), {
  ssr: false
});

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)]">
      <BackgroundGrid />
      <section className="relative z-10 grid min-h-[92vh] grid-cols-1 items-center gap-8 px-6 py-8 lg:grid-cols-[1fr_1.08fr] lg:px-12">
        <div className="max-w-4xl">
          <div className="mb-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(131,110,249,.32)] bg-[rgba(131,110,249,.12)] px-4 py-2 text-sm text-[var(--monad-purple-soft)]">
              <ShieldCheck size={16} /> Built on Monad
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(37,243,132,.24)] bg-[rgba(37,243,132,.08)] px-4 py-2 text-sm text-[var(--verified-green)]">
              <Truck size={16} /> Pharma · food · medical · high-value freight
            </div>
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal md:text-7xl">
            Stop trusting GPS. Prove custody.
          </h1>
          <p className="mt-5 max-w-3xl text-xl leading-8 text-[var(--text-secondary)]">
            Signed sensor witnesses for pharma, food, medical, and high-value shipments. Tamper alerts become verifiable
            Monad evidence receipts.
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
          <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
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
      <ProblemImpactStrip />
      <section className="relative z-10 mx-auto grid max-w-7xl gap-3 px-6 pb-16 lg:grid-cols-4 lg:px-12">
        {[
          {
            title: "The Blind Spot",
            label: "Location is not proof",
            icon: RouteOff,
            tone: "var(--chain-blue)",
            steps: ["GPS tracker goes dark", "central record remains mutable", "custody dispute starts late"]
          },
          {
            title: "The Attack",
            label: "Fraud becomes physical",
            icon: AlertTriangle,
            tone: "var(--tamper-red)",
            steps: ["fake carrier", "route deviation", "cargo substituted"]
          },
          {
            title: "The Sentinel Layer",
            label: "Many witnesses sign",
            icon: PackageSearch,
            tone: "var(--verified-green)",
            steps: ["QR joins swarm", "telemetry is signed", "risk agent flags anomaly"]
          },
          {
            title: "The Monad Receipt",
            label: "Evidence becomes public",
            icon: Boxes,
            tone: "var(--monad-purple-soft)",
            steps: ["payload hash", "Merkle root", "Monad tx receipt"]
          }
        ].map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="command-panel rounded-lg p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{section.title}</div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">{section.label}</div>
                </div>
                <Icon size={22} style={{ color: section.tone }} />
              </div>
              <div className="space-y-2">
                {section.steps.map((step, index) => (
                  <div key={step} className="grid grid-cols-[22px_1fr] items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="grid size-5 place-items-center rounded-full text-[10px]" style={{ background: `${section.tone}22`, color: section.tone }}>
                      {index + 1}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

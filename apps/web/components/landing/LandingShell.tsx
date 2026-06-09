import Link from "next/link";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
import { ComparisonTable } from "./ComparisonTable";
import { DemoPreview } from "./DemoPreview";
import { HeroSection } from "./HeroSection";
import { IntegrationStrip } from "./IntegrationStrip";
import { LandingCTA } from "./LandingCTA";
import { landingContent } from "./content";
import { MetricStrip } from "./MetricStrip";
import { PrivacyShield } from "./PrivacyShield";
import { TargetCustomerGrid } from "./TargetCustomerGrid";
import { ThreeStepFlow } from "./ThreeStepFlow";

export function LandingShell() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)]">
      <BackgroundGrid />
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[rgba(5,2,10,.72)] backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-3 font-semibold text-[var(--text-primary)]">
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--monad-purple)] text-sm text-white">M</span>
            Monad Sentinel
          </Link>
          <div className="hidden items-center gap-5 text-sm text-[var(--text-secondary)] md:flex">
            <a href="#how-it-works" className="transition hover:text-[var(--text-primary)]">
              How it works
            </a>
            <a href="#for-platforms" className="transition hover:text-[var(--text-primary)]">
              For platforms
            </a>
            <a href="#privacy" className="transition hover:text-[var(--text-primary)]">
              Privacy
            </a>
            <a href="#demo" className="transition hover:text-[var(--text-primary)]">
              Demo
            </a>
          </div>
          <div className="rounded-full border border-[rgba(37,243,132,.24)] bg-[rgba(37,243,132,.08)] px-3 py-1.5 text-xs font-semibold text-[var(--verified-green)]">
            {landingContent.hero.badges[4]}
          </div>
        </nav>
      </header>
      <HeroSection />
      <MetricStrip />
      <TargetCustomerGrid />
      <ComparisonTable />
      <ThreeStepFlow />
      <PrivacyShield />
      <DemoPreview />
      <IntegrationStrip />
      <LandingCTA />
    </main>
  );
}

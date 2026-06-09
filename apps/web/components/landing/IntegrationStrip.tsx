import { Code2, PlugZap } from "lucide-react";
import { landingContent } from "./content";
import { SectionHeading } from "./SectionHeading";

export function IntegrationStrip() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <SectionHeading
        eyebrow="Integration layer"
        title="Designed to sit underneath existing logistics systems."
        body="Use Sentinel as an invisible evidence layer inside your existing customer dashboard."
      />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {landingContent.integration.map((integration) => (
          <div key={integration} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-[rgba(76,201,240,.28)] bg-[rgba(76,201,240,.08)] text-[var(--chain-blue)]">
              {integration.includes("API") || integration.includes("SDK") ? <Code2 size={18} /> : <PlugZap size={18} />}
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{integration}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

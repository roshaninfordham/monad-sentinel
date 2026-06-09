import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { landingContent } from "./content";
import { SectionHeading } from "./SectionHeading";

const columns = [
  {
    title: "Public on Monad",
    icon: ShieldCheck,
    tone: "var(--monad-purple-soft)",
    items: landingContent.privacyShield.publicOnMonad
  },
  {
    title: "Encrypted off-chain",
    icon: LockKeyhole,
    tone: "var(--chain-blue)",
    items: landingContent.privacyShield.encryptedOffchain
  },
  {
    title: "Authorized dashboard",
    icon: Eye,
    tone: "var(--verified-green)",
    items: landingContent.privacyShield.authorizedDashboard
  }
];

export function PrivacyShield() {
  return (
    <section id="privacy" className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <SectionHeading
        eyebrow="Privacy Shield"
        title="Private where it matters. Public where proof matters."
        body="Sensitive shipment details stay encrypted. Monad anchors opaque commitments that make later edits detectable."
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {columns.map((column) => {
          const Icon = column.icon;
          return (
            <div key={column.title} className="command-panel rounded-lg p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-[var(--text-primary)]">{column.title}</div>
                <div className="grid size-10 place-items-center rounded-lg border border-white/10 bg-black/20" style={{ color: column.tone }}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="grid gap-2">
                {column.items.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-[var(--text-secondary)]">
                    {column.title === "Encrypted off-chain" ? (
                      <EyeOff size={15} className="text-[var(--chain-blue)]" />
                    ) : (
                      <ShieldCheck size={15} style={{ color: column.tone }} />
                    )}
                    {item}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

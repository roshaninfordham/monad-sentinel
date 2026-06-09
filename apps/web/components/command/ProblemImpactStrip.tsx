import { AlertTriangle, Cross, PackageX, Route, ShieldCheck } from "lucide-react";

const impactCards = [
  {
    label: "Cargo theft",
    value: "$725M",
    detail: "Reported U.S. cargo-theft losses hit record territory.",
    icon: PackageX,
    tone: "var(--tamper-red)"
  },
  {
    label: "Pharma risk",
    value: "1 in 10",
    detail: "Medicines in LMICs may be substandard or falsified.",
    icon: Cross,
    tone: "var(--warning-amber)"
  },
  {
    label: "GPS blind spot",
    value: "go dark",
    detail: "Trackers can be removed, disabled, or spoofed.",
    icon: Route,
    tone: "var(--chain-blue)"
  },
  {
    label: "Monad proof",
    value: "receipt",
    detail: "Hash, signature, Merkle root, transaction.",
    icon: ShieldCheck,
    tone: "var(--verified-green)"
  }
];

export function ProblemImpactStrip() {
  return (
    <section className="relative z-10 mx-auto grid max-w-7xl gap-3 px-6 pb-12 md:grid-cols-4 lg:px-12">
      {impactCards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="command-panel rounded-lg p-4">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{card.label}</div>
              <Icon size={18} style={{ color: card.tone }} />
            </div>
            <div className="metric-number text-3xl font-semibold" style={{ color: card.tone }}>
              {card.value}
            </div>
            <div className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{card.detail}</div>
          </div>
        );
      })}
      <div className="md:col-span-4">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <AlertTriangle size={13} />
          Stats are demo-context anchors; keep source citations in pitch notes and README, not dashboard chrome.
        </div>
      </div>
    </section>
  );
}

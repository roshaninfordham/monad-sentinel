import { Eye, LockKeyhole, ShieldCheck } from "lucide-react";

const columns = [
  {
    title: "Public on Monad",
    icon: ShieldCheck,
    tone: "text-[var(--monad-purple-soft)]",
    items: ["Merkle root", "Batch sequence", "Risk commitment", "Time bucket", "Tx hash"]
  },
  {
    title: "Encrypted off-chain",
    icon: LockKeyhole,
    tone: "text-[var(--warning-amber)]",
    items: ["GPS route", "Temperature", "Shock waveform", "Device identity", "Product identity"]
  },
  {
    title: "Authorized view",
    icon: Eye,
    tone: "text-[var(--verified-green)]",
    items: ["Journey map", "Stops", "Sensor timelines", "Receipts"]
  }
];

export function PrivacyShield() {
  return (
    <section className="command-panel overflow-hidden rounded-lg p-3">
      <div className="mb-3">
        <div className="text-sm font-semibold">Privacy Shield</div>
        <div className="text-xs text-[var(--text-secondary)]">Private evidence anchoring, not raw GPS on-chain</div>
      </div>
      <div className="grid gap-2">
        {columns.map(({ title, icon: Icon, tone, items }) => (
          <div key={title} className="rounded-md border border-white/10 bg-white/[0.035] p-2">
            <div className={`mb-1 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${tone}`}>
              <Icon size={13} /> {title}
            </div>
            <div className="flex flex-wrap gap-1">
              {items.map((item) => (
                <span key={item} className="rounded border border-white/10 bg-black/20 px-1.5 py-0.5 text-[0.66rem] text-[var(--text-secondary)]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

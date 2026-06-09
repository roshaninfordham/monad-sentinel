import { ReactNode } from "react";

export function AnimatedMetric({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="panel rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</div>
      <div className="mono mt-1 text-2xl font-semibold" style={{ color: accent ?? "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

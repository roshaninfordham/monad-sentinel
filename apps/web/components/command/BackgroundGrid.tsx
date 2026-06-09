export function BackgroundGrid() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[var(--bg-primary)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(131,110,249,0.24),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(37,243,132,0.08),transparent_24%)]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(131,110,249,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(131,110,249,.16) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          animation: "grid-pan 18s linear infinite"
        }}
      />
      <div className="scanline absolute inset-0" />
    </div>
  );
}

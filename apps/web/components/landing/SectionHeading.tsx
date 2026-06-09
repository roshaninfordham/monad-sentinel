export function SectionHeading({
  eyebrow,
  title,
  body
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--chain-blue)]">{eyebrow}</div> : null}
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-[var(--text-primary)] md:text-5xl">{title}</h2>
      {body ? <p className="mt-4 text-base leading-7 text-[var(--text-secondary)] md:text-lg">{body}</p> : null}
    </div>
  );
}

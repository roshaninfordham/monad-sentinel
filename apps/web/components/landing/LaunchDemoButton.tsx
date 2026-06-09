"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createSessionId } from "@/lib/session";

export function LaunchDemoButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function launch() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Live Proof Demo", viewportMode: "indoor", useCase: "pharma" })
      });
      if (!response.ok) throw new Error("session API failed");
      const data = (await response.json()) as { session?: { id?: string }; dashboardToken?: string };
      const id = data.session?.id ?? createSessionId();
      router.push(data.dashboardToken ? `/dashboard/${id}?d=${encodeURIComponent(data.dashboardToken)}` : `/dashboard/${id}`);
    } catch {
      router.push(`/dashboard/${createSessionId()}`);
    }
  }

  return (
    <button
      type="button"
      onClick={launch}
      disabled={pending}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--verified-green)] px-5 py-3 font-semibold text-black shadow-[0_0_34px_rgba(37,243,132,.24)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--verified-green)] disabled:cursor-wait disabled:opacity-75"
    >
      {pending ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
      {pending ? "Launching demo" : label}
    </button>
  );
}

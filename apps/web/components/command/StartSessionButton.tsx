"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createSessionId } from "@/lib/session";

export function StartSessionButton() {
  const router = useRouter();

  async function start() {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "Live Custody Swarm", mode: "indoor" })
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
      onClick={start}
      className="inline-flex items-center gap-2 rounded-md bg-[var(--verified-green)] px-5 py-3 font-semibold text-black shadow-[0_0_34px_rgba(37,243,132,.24)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--verified-green)]"
    >
      Start Live Custody Swarm <ArrowRight size={18} />
    </button>
  );
}

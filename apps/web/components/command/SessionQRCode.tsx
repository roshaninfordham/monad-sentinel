"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { getAppUrl } from "@/lib/session";

export function SessionQRCode({ sessionId }: { sessionId: string }) {
  const fallbackUrl = useMemo(() => `${getAppUrl()}/s/${sessionId}`, [sessionId]);
  const [url, setUrl] = useState(fallbackUrl);

  useEffect(() => {
    setUrl(fallbackUrl);
    const search = window.location.search;
    if (!search.includes("d=")) return;

    fetch(`/api/session/${sessionId}${search}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { joinToken?: string } | null) => {
        if (body?.joinToken) {
          setUrl(`${window.location.origin}/s/${sessionId}?t=${encodeURIComponent(body.joinToken)}`);
        }
      })
      .catch(() => {
        setUrl(fallbackUrl);
      });
  }, [fallbackUrl, sessionId]);

  return (
    <div className="panel rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Join Swarm</div>
          <div className="text-xs text-[var(--text-secondary)]">Scan to become a signed sensor</div>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(url)}
          className="rounded-md border border-white/10 bg-white/5 p-2 transition hover:border-[var(--monad-purple)]"
          aria-label="Copy QR URL"
        >
          <Copy size={16} />
        </button>
      </div>
      <div className="grid place-items-center rounded-lg bg-white p-3 shadow-[0_0_36px_rgba(37,243,132,.28)]">
        <QRCodeSVG value={url} size={216} level="M" bgColor="#ffffff" fgColor="#05020a" marginSize={2} />
      </div>
      <div className="hash mt-3 truncate text-xs text-[var(--text-secondary)]">{url}</div>
    </div>
  );
}

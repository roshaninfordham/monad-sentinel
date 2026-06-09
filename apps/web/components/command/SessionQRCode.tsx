"use client";

import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { getAppUrl } from "@/lib/session";

export function SessionQRCode({ sessionId }: { sessionId: string }) {
  const url = `${getAppUrl()}/s/${sessionId}`;

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
      <div className="rounded-lg bg-white p-3 shadow-[0_0_36px_rgba(37,243,132,.28)]">
        <QRCodeSVG value={url} size={172} level="M" />
      </div>
      <div className="hash mt-3 truncate text-xs text-[var(--text-secondary)]">{url}</div>
    </div>
  );
}

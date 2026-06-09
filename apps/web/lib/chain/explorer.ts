type ChainLinkBatch = {
  txHash?: string | null;
  status?: string | null;
  simulated?: boolean | null;
};

type ExplorerLink = {
  label: string;
  href: string;
};

function isPublicChainDisabled() {
  return process.env.NEXT_PUBLIC_CHAIN_MODE === "simulated" || process.env.NEXT_PUBLIC_CHAIN_DISABLED !== "false";
}

function normalizeTxBase(base?: string | null) {
  const value = base?.trim();
  if (!value) return null;
  return value;
}

function buildTxUrl(base: string, txHash: string) {
  if (base.includes("{tx}")) return base.replace("{tx}", txHash);
  if (base.endsWith("/")) return `${base}${txHash}`;
  return `${base}/${txHash}`;
}

export function isSimulatedChainBatch(batch?: ChainLinkBatch | null) {
  if (!batch) return true;
  const status = batch.status?.toLowerCase();
  return Boolean(
    isPublicChainDisabled() ||
      batch.simulated ||
      status === "simulated" ||
      status === "simulation" ||
      status === "mock" ||
      batch.txHash?.toLowerCase().includes("simulated")
  );
}

export function getExplorerTxLinks(batch?: ChainLinkBatch | null): ExplorerLink[] {
  if (!batch?.txHash || isSimulatedChainBatch(batch)) return [];

  const configured = normalizeTxBase(process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL);
  const fallbacks = [
    ["MonadVision", process.env.NEXT_PUBLIC_MONADVISION_TX_URL],
    ["Monadscan", process.env.NEXT_PUBLIC_MONADSCAN_TX_URL],
    ["SocialScan", process.env.NEXT_PUBLIC_SOCIALSCAN_TX_URL]
  ] as const;

  const links: ExplorerLink[] = [];
  if (configured) links.push({ label: "Explorer", href: buildTxUrl(configured, batch.txHash) });

  for (const [label, base] of fallbacks) {
    const normalized = normalizeTxBase(base);
    if (normalized) links.push({ label, href: buildTxUrl(normalized, batch.txHash) });
  }

  return links;
}


import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_DEMO_RETENTION_MINUTES = 30;
let lastCleanupAt = 0;

export function hasSupabaseServerEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function demoRetentionMinutes() {
  const configured = Number(process.env.DEMO_DATA_RETENTION_MINUTES ?? process.env.NEXT_PUBLIC_DEMO_DATA_RETENTION_MINUTES);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_DEMO_RETENTION_MINUTES;
  return Math.min(Math.max(Math.round(configured), 5), 24 * 60);
}

export function demoExpiresAt(from = new Date()) {
  return new Date(from.getTime() + demoRetentionMinutes() * 60_000).toISOString();
}

export function isExpiredIso(value?: string | null, now = Date.now()) {
  return Boolean(value && new Date(value).getTime() <= now);
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function cleanupExpiredDemoData(options: { force?: boolean; minIntervalMs?: number } = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { cleaned: false, deleted: 0, reason: "supabase-not-configured" };

  const now = Date.now();
  const minIntervalMs = options.minIntervalMs ?? 60_000;
  if (!options.force && now - lastCleanupAt < minIntervalMs) {
    return { cleaned: false, deleted: 0, reason: "rate-limited" };
  }
  lastCleanupAt = now;

  const { data, error } = await supabase.rpc("cleanup_expired_demo_data");
  if (!error) return { cleaned: true, deleted: Number(data ?? 0), reason: "rpc" };

  const fallback = await supabase.from("sessions").delete().lte("expires_at", new Date().toISOString()).select("id");
  if (fallback.error) {
    return { cleaned: false, deleted: 0, reason: fallback.error.message };
  }
  return { cleaned: true, deleted: fallback.data?.length ?? 0, reason: "fallback-delete" };
}

export async function broadcastRealtime(channelName: string, event: string, payload: unknown) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { sent: false, reason: "supabase-not-configured" };
  const channel = supabase.channel(channelName);
  await channel.subscribe();
  const result = await channel.send({ type: "broadcast", event, payload });
  await supabase.removeChannel(channel);
  return { sent: result === "ok", result };
}

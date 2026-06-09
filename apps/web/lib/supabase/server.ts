import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function hasSupabaseServerEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
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

export async function broadcastRealtime(channelName: string, event: string, payload: unknown) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { sent: false, reason: "supabase-not-configured" };
  const channel = supabase.channel(channelName);
  await channel.subscribe();
  const result = await channel.send({ type: "broadcast", event, payload });
  await supabase.removeChannel(channel);
  return { sent: result === "ok", result };
}

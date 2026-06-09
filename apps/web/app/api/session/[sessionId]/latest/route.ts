import { NextResponse } from "next/server";
import { cleanupExpiredDemoData, getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      devices: [],
      telemetryEvents: [],
      incidents: [],
      batches: [],
      simulatedPersistence: true
    });
  }

  await cleanupExpiredDemoData();
  const [devices, telemetryEvents, incidents, batches, shipments, custodyEvents] = await Promise.all([
    supabase
      .from("devices")
      .select(
        "id,alias,device_class,online,status,latest_lat_e7,latest_lng_e7,latest_accuracy_cm,latest_risk_score,latest_risk_flags,latest_batch_sequence,latest_tx_hash,first_seen_at,last_seen_at"
      )
      .eq("session_id", sessionId)
      .order("last_seen_at", { ascending: false })
      .limit(200),
    supabase
      .from("telemetry_events")
      .select(
        "id,session_id,device_id,seq,payload_hash,leaf_hash,event_hash,payload_commitment,ciphertext_hash,risk_commitment,event_class,risk_score,risk_flags,risk_reason,received_at,batch_sequence,tx_hash"
      )
      .eq("session_id", sessionId)
      .order("received_at", { ascending: false })
      .limit(200),
    supabase
      .from("incidents")
      .select("id,session_id,device_id,severity,risk_score,risk_flags,title,summary,agent_summary,evidence_hash,tx_hash,created_at,status")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("telemetry_batches")
      .select(
        "session_id,sequence,merkle_root,sample_count,max_risk_score,combined_flags,status,tx_hash,submitted_at,committed_at,shipment_commitment,route_policy_commitment,data_availability_hash,time_bucket"
      )
      .eq("session_id", sessionId)
      .order("sequence", { ascending: false })
      .limit(20),
    supabase
      .from("shipments")
      .select("*")
      .eq("session_id", sessionId)
      .limit(5),
    supabase
      .from("custody_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp_ms", { ascending: false })
      .limit(50)
  ]);

  const error = devices.error ?? telemetryEvents.error ?? incidents.error ?? batches.error ?? shipments.error ?? custodyEvents.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    devices: devices.data ?? [],
    telemetryEvents: telemetryEvents.data ?? [],
    incidents: incidents.data ?? [],
    batches: batches.data ?? [],
    shipments: shipments.data ?? [],
    custodyEvents: custodyEvents.data ?? [],
    simulatedPersistence: false
  });
}

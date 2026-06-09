import { SensorContent } from "./SensorContent";

export default async function SensorPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <SensorContent sessionId={sessionId} />;
}

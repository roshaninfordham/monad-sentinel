import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <DashboardClient sessionId={sessionId} />;
}

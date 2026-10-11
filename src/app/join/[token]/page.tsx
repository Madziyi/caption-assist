import ParticipantPage from "@/components/participant-page";
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ParticipantPage token={token} />;
}

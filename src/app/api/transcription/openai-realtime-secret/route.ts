import { NextResponse } from "next/server";
import { authenticatedRoomUser, isUuid, RoomFailure } from "@/lib/rooms/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const roomId = new URL(request.url).searchParams.get("roomId");
    if (!isUuid(roomId)) throw new RoomFailure(400, "Invalid conversation.");
    const { supabase, userId } = await authenticatedRoomUser(request);
    const { data, error } = await supabase.rpc("caption_room_action", { operation: "snapshot", actor: userId, target_room: roomId });
    if (error || !data || data.status !== "open" || data.self.removed || data.self.role === "host" || data.mode !== "headset") throw new RoomFailure(403, "This conversation is unavailable.");
  } catch (error) {
    const failure = error instanceof RoomFailure ? error : new RoomFailure(403, "This conversation is unavailable.");
    return NextResponse.json({ message: failure.message }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ code: "configuration_missing", message: "OpenAI shadow benchmark is unavailable: server configuration is missing." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        session: {
          type: "transcription",
          audio: {
            input: {
              format: { type: "audio/pcm", rate: 24000 },
              noise_reduction: null,
              transcription: { model: "gpt-live-transcribe", delay: "low", languages: ["en"], prompt: "Live accessibility captions for an in-person conversation.", keywords: [] },
              turn_detection: null,
            },
          },
        },
      }),
    });
    if (!response.ok) return unavailable();
    const payload = await response.json() as { client_secret?: { value?: string; expires_at?: number }; value?: string; expires_at?: number };
    const value = payload.client_secret?.value ?? payload.value;
    if (!value) return unavailable();
    return NextResponse.json({ ephemeralKey: value, expiresAt: payload.client_secret?.expires_at ?? payload.expires_at ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return unavailable();
  }
}

function unavailable() {
  return NextResponse.json({ code: "shadow_unavailable", message: "OpenAI shadow benchmark is unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } });
}

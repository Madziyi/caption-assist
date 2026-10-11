import { NextResponse } from "next/server";
import { authenticatedRoomUser, isUuid, RoomFailure } from "@/lib/rooms/server";

export const runtime = "nodejs";

export async function POST(request?: Request): Promise<NextResponse> {
  if (request && new URL(request.url).searchParams.has("roomId")) {
    try {
      const roomId = new URL(request.url).searchParams.get("roomId");
      if (!isUuid(roomId)) throw new RoomFailure(400, "Invalid conversation.");
      const { supabase, userId } = await authenticatedRoomUser(request);
      const { data, error } = await supabase.rpc("caption_room_action", { operation: "snapshot", actor: userId, target_room: roomId });
      if (error || !data || data.status !== "open" || data.self.removed) throw new RoomFailure(403, "This conversation is unavailable.");
    } catch (error) {
      const failure = error instanceof RoomFailure ? error : new RoomFailure(403, "This conversation is unavailable.");
      return NextResponse.json({ message: failure.message }, { status: failure.status });
    }
  }
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { code: "configuration_missing", message: "Speech service configuration is unavailable." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch("https://streaming.assemblyai.com/v3/token?expires_in_seconds=60", {
      headers: { authorization: apiKey },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json(
        { code: "temporary_token_failure", message: "The speech service could not issue a temporary session token." },
        { status: 502 },
      );
    }
    const payload = (await response.json()) as { token?: string };
    if (!payload.token) {
      return NextResponse.json(
        { code: "temporary_token_failure", message: "The speech service returned an invalid session token." },
        { status: 502 },
      );
    }
    return NextResponse.json({ token: payload.token }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { code: "temporary_token_failure", message: "The speech service could not be reached. Try again." },
      { status: 502 },
    );
  }
}

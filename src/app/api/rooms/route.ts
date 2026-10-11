import { NextResponse } from "next/server";
import { authenticatedRoomUser, invitation, hashInvitation, isUuid, RoomFailure } from "@/lib/rooms/server";
import { validateName } from "@/lib/rooms/types";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { supabase, userId } = await authenticatedRoomUser(request);
    const body = await request.json();
    const allowed = ["create", "create_headset", "join", "snapshot", "restore", "rename", "remove", "end", "check", "invite"];
    if (!allowed.includes(body.action)) throw new RoomFailure(400, "Invalid conversation action.");
    if (["snapshot", "rename", "remove", "end", "invite"].includes(body.action) && !isUuid(body.roomId)) throw new RoomFailure(400, "Invalid conversation.");
    if (body.action === "remove" && !isUuid(body.participantId)) throw new RoomFailure(400, "Invalid participant.");
    if (["join", "check"].includes(body.action) && (typeof body.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.token))) throw new RoomFailure(404, "This invitation is unavailable.");
    let name: string | null = null;
    if (["join", "rename"].includes(body.action)) {
      try { name = validateName(body.name); } catch { throw new RoomFailure(400, "Enter a name of 1–40 characters."); }
    }
    const invite = ["create", "create_headset", "invite"].includes(body.action) ? invitation() : null;
    const { data, error } = await supabase.rpc("caption_room_action", {
      operation: body.action, actor: userId, target_room: body.roomId ?? null,
      token_hash: invite?.hash ?? (body.token ? hashInvitation(body.token) : null),
      participant_name: name, target_participant: body.participantId ?? null,
    });
    if (error) {
      if (error.message.includes("removed")) throw new RoomFailure(403, "You were removed from this conversation.");
      if (error.message.includes("ended")) throw new RoomFailure(410, "This conversation has ended.");
      if (error.message.includes("forbidden")) throw new RoomFailure(403, "You cannot perform this conversation action.");
      throw new RoomFailure(503, "The conversation is unavailable. Check Connected Mode setup and try again.");
    }
    if (data === null) return NextResponse.json(null, { headers: { "Cache-Control": "no-store" } });
    const response = { ...data, ...(invite ? { joinToken: invite.token, joinUrl: `${new URL(request.url).origin}/join/${invite.token}` } : {}),
      ...(["create", "create_headset"].includes(body.action) ? { hostParticipantId: data.self?.id } : {}) };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = error instanceof RoomFailure ? error : new RoomFailure(400, "Invalid conversation request.");
    return NextResponse.json({ message: failure.message }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }
}

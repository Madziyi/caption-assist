import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export class RoomFailure extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export function serverRoomClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new RoomFailure(503, "Conversation server configuration is unavailable.");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function authenticatedRoomUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new RoomFailure(401, "Please reconnect to the conversation.");
  const supabase = serverRoomClient();
  const { data, error } = await supabase.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new RoomFailure(401, "Please reconnect to the conversation.");
  return { supabase, userId: data.user.id };
}
export function invitation() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInvitation(token) };
}
export function hashInvitation(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RoomMode, RoomSnapshot } from "./types";

let client: SupabaseClient | undefined;
export function roomClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Connected Mode is currently unavailable. Please check the conversation setup.");
  return client ??= createClient(url, key);
}

export async function technicalSession() {
  const supabase = roomClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const signedIn = await supabase.auth.signInAnonymously();
  if (signedIn.error || !signedIn.data.session) throw new Error("Could not connect anonymously. Try again.");
  return signedIn.data.session;
}

export async function roomRequest<T = RoomSnapshot>(action: string, values: Record<string, unknown> = {}): Promise<T> {
  const session = await technicalSession();
  const response = await fetch("/api/rooms", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...values }), cache: "no-store", signal: AbortSignal.timeout(12000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "The conversation could not be reached.");
  return data as T;
}
export function normalizeRoomMode(value: unknown): RoomMode { return value === "headset" ? "headset" : "connected"; }

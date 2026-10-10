import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
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
    return NextResponse.json({ token: payload.token });
  } catch {
    return NextResponse.json(
      { code: "temporary_token_failure", message: "The speech service could not be reached. Try again." },
      { status: 502 },
    );
  }
}

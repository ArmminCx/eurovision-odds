import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

  if (!DEEPGRAM_API_KEY) {
    return NextResponse.json({ error: "Deepgram API key missing in .env.local" }, { status: 500 });
  }

  // Simply return the key to the client
  return NextResponse.json({ key: DEEPGRAM_API_KEY });
}
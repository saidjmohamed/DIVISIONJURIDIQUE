import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    openRouterPrefix: process.env.OPENROUTER_API_KEY?.slice(0, 10) ?? "NOT_SET",
  });
}

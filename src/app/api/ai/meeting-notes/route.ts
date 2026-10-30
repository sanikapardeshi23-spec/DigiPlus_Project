import { NextRequest, NextResponse } from "next/server";
import { processMeetingWithClaude } from "@/lib/ai/claude";
import { claudeMeetingInputSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const parseResult = claudeMeetingInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input parameters",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { title, agenda, participants, raw_notes } = parseResult.data;

    // Process with Claude API
    const analysis = await processMeetingWithClaude({
      title,
      agenda,
      participants,
      raw_notes,
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error({ message: err.message }, "API: Failed to process meeting with Claude");

    const isApiKeyMissing =
      err.message?.includes("ANTHROPIC_API_KEY") ||
      err.message?.includes("API key");

    return NextResponse.json(
      {
        success: false,
        error: err.message || "An error occurred while processing meeting notes with Claude.",
        code: isApiKeyMissing ? "API_KEY_MISSING" : "AI_PROCESSING_ERROR",
      },
      { status: isApiKeyMissing ? 400 : 500 }
    );
  }
}


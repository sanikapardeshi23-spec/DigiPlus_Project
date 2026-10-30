import { NextRequest, NextResponse } from "next/server";
import { processMeetingWithOpenAI } from "@/lib/ai/openai";
import { meetingInputSchema } from "@/lib/validation";
import { logger, generateRequestId } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || generateRequestId("req-ai-notes");

  try {
    const body = await req.json();

    // Validate input using Zod
    const parseResult = meetingInputSchema.safeParse(body);
    if (!parseResult.success) {
      logger.system(
        "validation_failure",
        {
          endpoint: "/api/ai/meeting-notes",
          error: "Invalid input parameters",
          details: parseResult.error.format(),
        },
        requestId,
        "warn"
      );

      return NextResponse.json(
        {
          success: false,
          error: "Invalid input parameters. Please check required meeting fields.",
          details: parseResult.error.format(),
          requestId,
        },
        {
          status: 400,
          headers: { "X-Request-Id": requestId },
        }
      );
    }

    const { title, agenda, participants, raw_notes } = parseResult.data;

    // Process with OpenAI API
    const analysis = await processMeetingWithOpenAI(
      {
        title,
        agenda,
        participants,
        raw_notes,
      },
      requestId
    );

    return NextResponse.json(
      {
        success: true,
        data: analysis,
        requestId,
      },
      {
        headers: { "X-Request-Id": requestId },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;

    const isApiKeyMissing =
      err.message?.includes("OPENAI_API_KEY") ||
      err.message?.includes("API key");

    const isQuotaExceeded =
      err.message?.includes("429") ||
      err.message?.includes("quota") ||
      err.message?.includes("billing");

    logger.system(
      "api_error",
      {
        endpoint: "/api/ai/meeting-notes",
        message: err.message,
        isApiKeyMissing,
        isQuotaExceeded,
      },
      requestId,
      "error"
    );

    let userFriendlyMessage = err.message || "An error occurred while processing meeting notes with OpenAI.";
    let errorCode = "AI_PROCESSING_ERROR";

    if (isApiKeyMissing) {
      errorCode = "API_KEY_MISSING";
      userFriendlyMessage = "OpenAI API key is missing. Please configure OPENAI_API_KEY in .env.local.";
    } else if (isQuotaExceeded) {
      errorCode = "QUOTA_EXCEEDED";
      userFriendlyMessage = "OpenAI API quota or credits exceeded. Please verify your OpenAI billing plan.";
    }

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyMessage,
        code: errorCode,
        requestId,
      },
      {
        status: isApiKeyMissing ? 400 : isQuotaExceeded ? 429 : 500,
        headers: { "X-Request-Id": requestId },
      }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { generateCatchUpBriefWithOpenAI, CatchUpBriefInput } from "@/lib/ai/openai";
import { logger, generateRequestId } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || generateRequestId("req-ai-brief");

  try {
    const body = await req.json();

    if (!body || !body.meetingTitle || !body.meetingTitle.trim()) {
      logger.system(
        "validation_failure",
        {
          endpoint: "/api/ai/catch-up-brief",
          error: "Missing required parameter: meetingTitle",
        },
        requestId,
        "warn"
      );

      return NextResponse.json(
        { success: false, error: "Missing required parameter: meetingTitle", requestId },
        { status: 400, headers: { "X-Request-Id": requestId } }
      );
    }

    const input: CatchUpBriefInput = {
      meetingId: body.meetingId,
      meetingTitle: body.meetingTitle.trim(),
      meetingDate: body.meetingDate,
      participants: body.participants || [],
      agenda: body.agenda,
      notes: body.notes,
      summary: body.summary,
      decisions: body.decisions || [],
      actionItems: body.actionItems || [],
      carriedForwardTasks: body.carriedForwardTasks || [],
      userContext: body.userContext,
    };

    const result = await generateCatchUpBriefWithOpenAI(input, requestId);

    return NextResponse.json(
      {
        success: true,
        brief: result.brief,
        aiGenerated: result.aiGenerated,
        requestId,
      },
      {
        headers: { "X-Request-Id": requestId },
      }
    );
  } catch (err: unknown) {
    const error = err as Error;
    logger.system(
      "api_error",
      {
        endpoint: "/api/ai/catch-up-brief",
        message: error.message,
      },
      requestId,
      "error"
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate catch-up brief",
        requestId,
      },
      {
        status: 500,
        headers: { "X-Request-Id": requestId },
      }
    );
  }
}

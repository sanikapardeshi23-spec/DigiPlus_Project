import { NextRequest, NextResponse } from "next/server";
import { generateCatchUpBriefWithClaude, CatchUpBriefInput } from "@/lib/ai/claude";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.meetingTitle) {
      return NextResponse.json(
        { error: "Missing required parameter: meetingTitle" },
        { status: 400 }
      );
    }

    const input: CatchUpBriefInput = {
      meetingTitle: body.meetingTitle,
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

    const result = await generateCatchUpBriefWithClaude(input);

    return NextResponse.json({
      success: true,
      brief: result.brief,
      aiGenerated: result.aiGenerated,
    });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error({ err }, "API: Error generating catch-up brief");
    return NextResponse.json(
      { error: error.message || "Failed to generate catch-up brief" },
      { status: 500 }
    );
  }
}

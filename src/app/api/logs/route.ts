import { NextRequest, NextResponse } from "next/server";
import { writeToServerLogFile, sanitizeLogData, StructuredLogRecord } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid log payload" }, { status: 400 });
    }

    const sanitized = sanitizeLogData(body) as Record<string, unknown>;
    const record: StructuredLogRecord = {
      level: (sanitized.level as StructuredLogRecord["level"]) || "info",
      timestamp: (sanitized.timestamp as string) || new Date().toISOString(),
      requestId: sanitized.requestId as string | undefined,
      event: (sanitized.event as string) || "client_event",
      status: sanitized.status as string | undefined,
      taskId: sanitized.taskId as string | undefined,
      meetingId: sanitized.meetingId as string | undefined,
      ...sanitized,
    };

    writeToServerLogFile(record);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}


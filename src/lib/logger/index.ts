/* eslint-disable @typescript-eslint/no-require-imports */
import pino from "pino";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type MeetingEvent =
  | "meeting_created"
  | "meeting_updated"
  | "meeting_deleted"
  | "transcript_saved"
  | "ai_summary_generated";

export type TaskEvent =
  | "task_created"
  | "task_reassigned"
  | "task_updated"
  | "task_completed"
  | "task_reopened"
  | "task_carried_forward";

export type AiEvent =
  | "ai_request_started"
  | "ai_request_completed"
  | "ai_request_failed"
  | "ai_response_validation_failed"
  | "ai_response_latency";

export type SystemEvent =
  | "database_connection_failure"
  | "database_error"
  | "validation_failure"
  | "api_error"
  | "application_error";

export type EventName = MeetingEvent | TaskEvent | AiEvent | SystemEvent | string;

export interface StructuredLogRecord {
  level: LogLevel;
  timestamp: string;
  requestId?: string;
  event: EventName;
  status?: "success" | "failure" | "pending" | string;
  taskId?: string;
  meetingId?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const isServer = typeof window === "undefined";

// Generate unique correlation / request IDs (e.g., req-1730278123-ab12)
export function generateRequestId(prefix: string = "req"): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${randomStr}`;
}

// Redact sensitive credentials and truncate transcripts
const SENSITIVE_KEY_REGEX = /key|token|password|secret|auth|bearer|credential/i;

export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (
      (key.toLowerCase().includes("transcript") ||
        key.toLowerCase().includes("raw_notes") ||
        key.toLowerCase().includes("rawnotes")) &&
      typeof val === "string" &&
      val.length > 100
    ) {
      sanitized[key] = `${val.substring(0, 100)}... [TRUNCATED_${val.length}_BYTES]`;
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeLogData(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

// Server-side local file log sink
let fsModule: typeof import("fs") | null = null;
let pathModule: typeof import("path") | null = null;

if (isServer) {
  try {
    // Dynamic requires to ensure Turbopack client bundling ignores Node core modules
    fsModule = require("fs");
    pathModule = require("path");
  } catch {
    // Client environment fallback
  }
}

export function writeToServerLogFile(record: StructuredLogRecord): void {
  if (!isServer || !fsModule || !pathModule) return;

  try {
    const logFilePath = pathModule.join(process.cwd(), "logs", "app.log");
    const line = JSON.stringify(record) + "\n";
    fsModule.appendFileSync(logFilePath, line, "utf8");
  } catch (e) {
    // Fallback if filesystem write fails
    console.error("Failed to append structured log to local file:", e);
  }
}

// Base Pino instance
const pinoInstance = isServer
  ? pino({
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                ignore: "pid,hostname",
              },
            }
          : undefined,
    })
  : pino({
      browser: {
        asObject: true,
      },
      level: "info",
    });

/**
 * Primary structured log emitter
 */
export function logStructuredEvent(
  level: LogLevel,
  event: EventName,
  data: Record<string, unknown> = {},
  requestId?: string
): StructuredLogRecord {
  const sanitized = sanitizeLogData(data) as Record<string, unknown>;

  const record: StructuredLogRecord = {
    level,
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    event,
    ...sanitized,
  };

  // Write to console/Pino
  if (level === "error") {
    pinoInstance.error(record, `[${event}]`);
  } else if (level === "warn") {
    pinoInstance.warn(record, `[${event}]`);
  } else if (level === "debug") {
    pinoInstance.debug(record, `[${event}]`);
  } else {
    pinoInstance.info(record, `[${event}]`);
  }

  // Write to server local log file
  if (isServer) {
    writeToServerLogFile(record);
  } else if (typeof window !== "undefined") {
    // Asynchronously forward important client events to server logs
    try {
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
        keepalive: true,
      }).catch(() => {
        // Suppress browser fetch failures for logs
      });
    } catch {
      // Ignore
    }
  }

  return record;
}

// Convenience helpers
export const logger = {
  // Standard Pino pass-through
  debug: (obj: Record<string, unknown> | string, msg?: string) => {
    if (typeof obj === "string") pinoInstance.debug(obj);
    else pinoInstance.debug(sanitizeLogData(obj) as object, msg);
  },
  info: (obj: Record<string, unknown> | string, msg?: string) => {
    if (typeof obj === "string") pinoInstance.info(obj);
    else pinoInstance.info(sanitizeLogData(obj) as object, msg);
  },
  warn: (obj: Record<string, unknown> | string, msg?: string) => {
    if (typeof obj === "string") pinoInstance.warn(obj);
    else pinoInstance.warn(sanitizeLogData(obj) as object, msg);
  },
  error: (obj: Record<string, unknown> | string, msg?: string) => {
    if (typeof obj === "string") pinoInstance.error(obj);
    else pinoInstance.error(sanitizeLogData(obj) as object, msg);
  },

  // Structured events
  event: logStructuredEvent,

  meeting: (
    event: MeetingEvent,
    data: Record<string, unknown> = {},
    requestId?: string,
    level: LogLevel = "info"
  ) => logStructuredEvent(level, event, data, requestId),

  task: (
    event: TaskEvent,
    data: Record<string, unknown> = {},
    requestId?: string,
    level: LogLevel = "info"
  ) => logStructuredEvent(level, event, data, requestId),

  ai: (
    event: AiEvent,
    data: Record<string, unknown> = {},
    requestId?: string,
    level: LogLevel = "info"
  ) => logStructuredEvent(level, event, data, requestId),

  system: (
    event: SystemEvent,
    data: Record<string, unknown> = {},
    requestId?: string,
    level: LogLevel = "error"
  ) => logStructuredEvent(level, event, data, requestId),
};

export default logger;

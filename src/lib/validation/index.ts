import { z } from "zod";

// Helper date format validator (YYYY-MM-DD or ISO 8601)
const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export const participantSchema = z.object({
  name: z.string().trim().min(1, "Participant name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  role: z.string().optional(),
});

export const meetingSchema = z.object({
  title: z.string().trim().min(1, "Meeting title is required"),
  date: z
    .string()
    .trim()
    .min(1, "Date is required")
    .refine((val) => dateRegex.test(val) && !isNaN(Date.parse(val)), {
      message: "Meeting date must be a valid date",
    }),
  time: z.string().default("10:00 AM"),
  durationMinutes: z.coerce.number().min(5, "Duration must be at least 5 minutes").default(45),
  location: z.string().optional(),
  agenda: z.string().default(""),
  notes: z.string().trim().min(1, "Meeting notes must be valid non-empty text"),
  participants: z.array(participantSchema).default([{ name: "Alex Morgan" }]),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().optional(),
  owner: z.string().trim().min(1, "Task owner is required"),
  ownerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  dueDate: z
    .string()
    .trim()
    .min(1, "Due date is required")
    .refine((val) => dateRegex.test(val) && !isNaN(Date.parse(val)), {
      message: "Due date must be a valid date",
    }),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["open", "pending", "in_progress", "completed", "overdue"]).default("pending"),
  meetingId: z.string().optional(),
  outcome: z.string().optional(),
});

export const knowledgeDocumentSchema = z.object({
  title: z.string().trim().min(1, "Knowledge document title is required"),
  category: z.string().trim().min(1, "Category is required"),
  tags: z.string().or(z.array(z.string())).default([]),
  content: z.string().trim().min(5, "Knowledge document content is required (minimum 5 characters)"),
  author: z.string().trim().min(1, "Author name is required").default("Alex Morgan"),
});

export const workspaceSettingsSchema = z.object({
  workspaceName: z.string().trim().min(2, "Workspace name is required"),
  userName: z.string().trim().min(2, "Your name is required"),
  userEmail: z.string().email("Valid email is required"),
  openaiModel: z.string().default("gpt-4.1-mini"),
  claudeModel: z.string().optional(),
  defaultMeetingDuration: z.coerce.number().min(15).max(240),
  autoExtractTasks: z.boolean(),
  emailNotifications: z.boolean(),
});

// Audio Upload Validation Schema (supports up to 25MB)
export const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
  "audio/aac",
];

export const audioUploadSchema = z.object({
  name: z.string().min(1, "File name is required"),
  size: z
    .number()
    .positive("File size must be greater than 0")
    .max(MAX_AUDIO_SIZE_BYTES, `Audio file exceeds maximum allowed size of 25MB`),
  type: z.string().refine((t) => ALLOWED_AUDIO_TYPES.includes(t.toLowerCase()), {
    message: "Invalid audio format. Allowed types: MP3, WAV, M4A, WebM, OGG, AAC",
  }),
});

// OpenAI AI Processing Schemas
export const actionItemSchema = z.object({
  title: z.string().trim().min(1, "Action item title is required"),
  description: z.string().nullable().optional(),
  owner_name: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["open", "pending", "in_progress", "completed", "overdue"]).default("pending"),
});

export const meetingProcessingSchema = z.object({
  summary: z.string().trim().min(1, "Summary is required"),
  key_points: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  action_items: z.array(actionItemSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
});

export const meetingInputSchema = z.object({
  title: z.string().trim().min(1, "Meeting title is required"),
  agenda: z.string().default(""),
  participants: z.string().default(""),
  raw_notes: z.string().trim().min(1, "Raw meeting notes are required for AI analysis"),
});

// Helper validation functions for clean UI error messages
export function validateMeetingForm(data: {
  title: string;
  notes?: string;
  date?: string;
}): { isValid: boolean; error?: string } {
  if (!data.title || !data.title.trim()) {
    return { isValid: false, error: "Meeting title is required" };
  }
  if (data.notes !== undefined && !data.notes.trim()) {
    return { isValid: false, error: "Meeting notes cannot be empty" };
  }
  if (data.date && isNaN(Date.parse(data.date))) {
    return { isValid: false, error: "Please enter a valid meeting date" };
  }
  return { isValid: true };
}

export function validateTaskForm(data: {
  title: string;
  owner?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
}): { isValid: boolean; error?: string } {
  if (!data.title || !data.title.trim()) {
    return { isValid: false, error: "Task title is required" };
  }
  if (data.owner !== undefined && !data.owner.trim()) {
    return { isValid: false, error: "Task owner is required" };
  }
  if (data.dueDate && isNaN(Date.parse(data.dueDate))) {
    return { isValid: false, error: "Please enter a valid due date" };
  }
  const allowedPriorities = ["low", "medium", "high", "urgent"];
  if (data.priority && !allowedPriorities.includes(data.priority)) {
    return { isValid: false, error: "Priority must be Low, Medium, High, or Urgent" };
  }
  const allowedStatuses = ["open", "pending", "in_progress", "completed", "overdue"];
  if (data.status && !allowedStatuses.includes(data.status)) {
    return { isValid: false, error: "Status must be Open, In Progress, or Completed" };
  }
  return { isValid: true };
}

export function validateKnowledgeForm(data: {
  title: string;
  content: string;
  category?: string;
}): { isValid: boolean; error?: string } {
  if (!data.title || !data.title.trim()) {
    return { isValid: false, error: "Document title is required" };
  }
  if (!data.content || data.content.trim().length < 5) {
    return { isValid: false, error: "Document content is required (at least 5 characters)" };
  }
  if (data.category !== undefined && !data.category.trim()) {
    return { isValid: false, error: "Category is required" };
  }
  return { isValid: true };
}

export function validateAudioFile(file: {
  name: string;
  size: number;
  type: string;
}): { isValid: boolean; error?: string } {
  const result = audioUploadSchema.safeParse(file);
  if (!result.success) {
    return { isValid: false, error: result.error.issues[0]?.message || "Invalid audio file" };
  }
  return { isValid: true };
}

export type MeetingInput = z.infer<typeof meetingSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type KnowledgeDocumentInput = z.infer<typeof knowledgeDocumentSchema>;
export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;
export type AiMeetingInput = z.infer<typeof meetingInputSchema>;
export type AiMeetingOutput = z.infer<typeof meetingProcessingSchema>;

// Aliases for backwards compatibility
export const claudeActionItemSchema = actionItemSchema;
export const claudeMeetingProcessingSchema = meetingProcessingSchema;
export const claudeMeetingInputSchema = meetingInputSchema;
export type ClaudeMeetingInput = AiMeetingInput;
export type ClaudeMeetingOutput = AiMeetingOutput;

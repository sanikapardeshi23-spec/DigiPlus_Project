import { z } from "zod";

export const participantSchema = z.object({
  name: z.string().min(1, "Participant name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  role: z.string().optional(),
});

export const meetingSchema = z.object({
  title: z.string().min(2, "Meeting title must be at least 2 characters"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  durationMinutes: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  location: z.string().optional(),
  agenda: z.string().min(5, "Agenda must be at least 5 characters"),
  notes: z.string().default(""),
  participants: z.array(participantSchema).min(1, "At least one participant is required"),
});

export const taskSchema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters"),
  description: z.string().optional(),
  owner: z.string().min(1, "Task owner is required"),
  ownerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]).default("pending"),
  meetingId: z.string().optional(),
});

export const knowledgeDocumentSchema = z.object({
  title: z.string().min(2, "Document title must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  tags: z.string().or(z.array(z.string())),
  content: z.string().min(10, "Content must be at least 10 characters"),
  author: z.string().min(1, "Author name is required"),
});

export const workspaceSettingsSchema = z.object({
  workspaceName: z.string().min(2, "Workspace name is required"),
  userName: z.string().min(2, "Your name is required"),
  userEmail: z.string().email("Valid email is required"),
  claudeModel: z.string().min(1, "Claude model selection is required"),
  defaultMeetingDuration: z.coerce.number().min(15).max(240),
  autoExtractTasks: z.boolean(),
  emailNotifications: z.boolean(),
});

export type MeetingInput = z.infer<typeof meetingSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type KnowledgeDocumentInput = z.infer<typeof knowledgeDocumentSchema>;
export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;

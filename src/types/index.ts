export type Priority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "open" | "pending" | "in_progress" | "completed" | "overdue";

// Database Record Schemas (Supabase)
export interface DbMeeting {
  id: string;
  title: string;
  meeting_date: string;
  agenda: string;
  participants: string;
  raw_notes: string;
  summary: string | null;
  created_at: string;
}

export interface DbDecision {
  id: string;
  meeting_id: string;
  decision_text: string;
  created_at: string;
}

export interface DbActionItem {
  id: string;
  meeting_id: string | null;
  original_meeting_id?: string | null;
  carried_over?: boolean;
  title: string;
  description: string | null;
  owner_name: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  outcome: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTaskHistory {
  id: string;
  task_id: string;
  action: string;
  details: string | null;
  performed_by: string;
  created_at: string;
}

export interface DbKnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

// Frontend Domain Models
export interface TaskHistoryItem {
  id: string;
  taskId?: string;
  timestamp: string;
  action: string;
  details?: string;
  performedBy: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  owner: string;
  ownerEmail?: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  meetingId?: string;
  meetingTitle?: string;
  originalMeetingId?: string;
  originalMeetingTitle?: string;
  outcome?: string;
  carriedOver?: boolean;
  createdAt: string;
  updatedAt: string;
  history?: TaskHistoryItem[];
}

export interface Participant {
  name: string;
  email?: string;
  role?: string;
}

export interface Decision {
  id?: string;
  meetingId?: string;
  decisionText: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  location?: string;
  status: "scheduled" | "completed" | "in_progress";
  participants: Participant[];
  agenda: string;
  notes: string;
  rawNotes?: string;
  aiSummary?: string;
  summary?: string;
  decisions?: string[];
  actionItems?: string[];
  pendingTasks?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettings {
  workspaceName: string;
  userName: string;
  userEmail: string;
  claudeModel: string;
  defaultMeetingDuration: number;
  autoExtractTasks: boolean;
  emailNotifications: boolean;
}

export interface DashboardStats {
  totalMeetings: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingMeetingsCount: number;
}

// Claude AI Meeting Processing Output
export interface ClaudeProcessedActionItem {
  title: string;
  description: string | null;
  owner_name: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
}

export interface ClaudeMeetingProcessingResult {
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: ClaudeProcessedActionItem[];
  uncertainties: string[];
}

export type ClaudeMeetingOutput = ClaudeMeetingProcessingResult;

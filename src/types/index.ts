export type Priority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

export interface TaskHistoryItem {
  id: string;
  timestamp: string;
  action: string;
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
  aiSummary?: string;
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

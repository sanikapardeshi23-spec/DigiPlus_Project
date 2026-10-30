"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { Meeting, Task, KnowledgeDocument, WorkspaceSettings, DashboardStats } from "@/types";

const INITIAL_MEETINGS: Meeting[] = [
  {
    id: "m-1",
    title: "Q4 Product Strategy & AI Roadmap Alignment",
    date: "2026-11-02",
    time: "10:00 AM",
    durationMinutes: 60,
    location: "Conference Room A / Zoom",
    status: "completed",
    participants: [
      { name: "Alex Morgan", email: "alex@digiplus.internal", role: "Product Lead" },
      { name: "Sara Chen", email: "sara@digiplus.internal", role: "Tech Lead" },
      { name: "Marcus Vance", email: "marcus@digiplus.internal", role: "UX Designer" },
    ],
    agenda: "1. Review Q3 metrics.\n2. Finalize AI catch-up brief feature scope.\n3. Agree on Claude 3.5 Sonnet integration timeline.",
    notes: "Discussed AI capabilities. Team agreed to use Anthropic Claude for extracting action items and generating catch-up briefs. Sara noted need for fallback if API timeout occurs. Marcus will deliver mockups by Wednesday.",
    aiSummary: "The team agreed to integrate Claude 3.5 Sonnet for meeting notes summarization and automated task extraction. UX mockups are due mid-week, with engineering prioritizing database models.",
    decisions: [
      "Adopt Anthropic Claude 3.5 Sonnet for workspace intelligence.",
      "Carry over pending sprint tasks automatically into subsequent syncs.",
    ],
    actionItems: [
      "Prepare detailed Claude API prompt templates (Sara Chen)",
      "Deliver high-fidelity catch-up brief layouts (Marcus Vance)",
    ],
    pendingTasks: ["Confirm Supabase PostgreSQL connection pool settings"],
    createdAt: "2026-10-28T09:00:00Z",
    updatedAt: "2026-10-28T11:00:00Z",
  },
  {
    id: "m-2",
    title: "DigiPlus Sprint 12 Planning & Backlog Grooming",
    date: "2026-11-04",
    time: "02:30 PM",
    durationMinutes: 45,
    location: "Google Meet",
    status: "scheduled",
    participants: [
      { name: "Sara Chen", email: "sara@digiplus.internal", role: "Tech Lead" },
      { name: "David Kim", email: "david@digiplus.internal", role: "Full Stack Eng" },
      { name: "Alex Morgan", email: "alex@digiplus.internal", role: "Product Lead" },
    ],
    agenda: "1. Velocity review from Sprint 11.\n2. Story point estimation for task history.\n3. Sprint commitments.",
    notes: "Review carry-over tasks from previous retrospective and ensure task owners are assigned.",
    createdAt: "2026-10-29T14:00:00Z",
    updatedAt: "2026-10-29T14:00:00Z",
  },
  {
    id: "m-3",
    title: "Client Feedback Synthesis & Knowledge Base Audit",
    date: "2026-11-06",
    time: "11:00 AM",
    durationMinutes: 30,
    location: "Huddle Space B",
    status: "scheduled",
    participants: [
      { name: "Alex Morgan", email: "alex@digiplus.internal", role: "Product Lead" },
      { name: "Elena Rostova", email: "elena@digiplus.internal", role: "Customer Success" },
    ],
    agenda: "Review customer onboarding friction points and document resolutions in Knowledge Base.",
    notes: "Prepare documentation regarding meeting notes parsing and search functionality.",
    createdAt: "2026-10-30T08:00:00Z",
    updatedAt: "2026-10-30T08:00:00Z",
  },
];

const INITIAL_TASKS: Task[] = [
  {
    id: "t-1",
    title: "Finalize Claude API prompt template for note extraction",
    description: "Write structured system prompt returning clean JSON with summary, decisions, and action items.",
    owner: "Sara Chen",
    ownerEmail: "sara@digiplus.internal",
    dueDate: "2026-11-03",
    priority: "high",
    status: "in_progress",
    meetingId: "m-1",
    meetingTitle: "Q4 Product Strategy & AI Roadmap Alignment",
    carriedOver: false,
    createdAt: "2026-10-28T11:00:00Z",
    updatedAt: "2026-10-29T09:30:00Z",
    history: [
      { id: "h-1", timestamp: "2026-10-28T11:00:00Z", action: "Task created from Meeting m-1", performedBy: "AI Assistant" },
      { id: "h-2", timestamp: "2026-10-29T09:30:00Z", action: "Status changed to in_progress", performedBy: "Sara Chen" },
    ],
  },
  {
    id: "t-2",
    title: "Implement automatic task carry-over for scheduled meetings",
    description: "Ensure incomplete tasks from prior meetings automatically list in upcoming meeting agendas.",
    owner: "David Kim",
    ownerEmail: "david@digiplus.internal",
    dueDate: "2026-11-05",
    priority: "urgent",
    status: "pending",
    meetingId: "m-2",
    meetingTitle: "DigiPlus Sprint 12 Planning & Backlog Grooming",
    carriedOver: true,
    createdAt: "2026-10-27T10:00:00Z",
    updatedAt: "2026-10-27T10:00:00Z",
    history: [
      { id: "h-3", timestamp: "2026-10-27T10:00:00Z", action: "Task created", performedBy: "Alex Morgan" },
      { id: "h-4", timestamp: "2026-10-29T14:15:00Z", action: "Carried over into Sprint 12 meeting", performedBy: "System" },
    ],
  },
  {
    id: "t-3",
    title: "Design interactive catch-up brief modal and export actions",
    description: "Create accessible dialog allowing users to generate and review AI catch-up summaries.",
    owner: "Marcus Vance",
    ownerEmail: "marcus@digiplus.internal",
    dueDate: "2026-11-01",
    priority: "medium",
    status: "completed",
    meetingId: "m-1",
    meetingTitle: "Q4 Product Strategy & AI Roadmap Alignment",
    carriedOver: false,
    createdAt: "2026-10-26T15:00:00Z",
    updatedAt: "2026-10-30T10:00:00Z",
    history: [
      { id: "h-5", timestamp: "2026-10-26T15:00:00Z", action: "Task created", performedBy: "Marcus Vance" },
      { id: "h-6", timestamp: "2026-10-30T10:00:00Z", action: "Status marked as completed", performedBy: "Marcus Vance" },
    ],
  },
  {
    id: "t-4",
    title: "Review Supabase PostgreSQL migrations & RLS policies",
    description: "Ensure table schemas for meetings, tasks, and knowledge docs have proper constraints and indexes.",
    owner: "Sara Chen",
    ownerEmail: "sara@digiplus.internal",
    dueDate: "2026-10-28",
    priority: "high",
    status: "overdue",
    carriedOver: false,
    createdAt: "2026-10-24T12:00:00Z",
    updatedAt: "2026-10-29T18:00:00Z",
    history: [
      { id: "h-7", timestamp: "2026-10-24T12:00:00Z", action: "Task created", performedBy: "Sara Chen" },
      { id: "h-8", timestamp: "2026-10-29T00:01:00Z", action: "Marked overdue by system scheduler", performedBy: "System" },
    ],
  },
  {
    id: "t-5",
    title: "Draft user onboarding guide for meeting knowledge search",
    description: "Document full-text search operators and tagging system for the knowledge base.",
    owner: "Elena Rostova",
    ownerEmail: "elena@digiplus.internal",
    dueDate: "2026-11-08",
    priority: "low",
    status: "pending",
    meetingId: "m-3",
    meetingTitle: "Client Feedback Synthesis & Knowledge Base Audit",
    carriedOver: false,
    createdAt: "2026-10-30T08:30:00Z",
    updatedAt: "2026-10-30T08:30:00Z",
    history: [
      { id: "h-9", timestamp: "2026-10-30T08:30:00Z", action: "Task created", performedBy: "Alex Morgan" },
    ],
  },
];

const INITIAL_DOCS: KnowledgeDocument[] = [
  {
    id: "doc-1",
    title: "DigiPlus Architecture & Coding Standards",
    category: "Engineering",
    tags: ["architecture", "nextjs", "supabase", "standards"],
    content: "All features in DigiPlus follow Next.js App Router patterns with strict TypeScript and server-side secret handling. Reusable components reside in src/components/ui. Validation schemas are managed using Zod, and structured application logs are formatted with Pino.",
    author: "Sara Chen",
    createdAt: "2026-10-25T10:00:00Z",
    updatedAt: "2026-10-28T14:20:00Z",
  },
  {
    id: "doc-2",
    title: "AI Note Structuring & Catch-Up Protocol",
    category: "AI & Intelligence",
    tags: ["claude", "summaries", "catch-up", "meetings"],
    content: "When meeting notes are recorded, Claude 3.5 Sonnet analyzes unstructured discussions into: 1. Executive Summary; 2. Concrete Decisions; 3. Action Items with owners and due dates; 4. Open Questions. Any incomplete action items are automatically preserved in the task history and flagged for carry-over into upcoming syncs.",
    author: "Alex Morgan",
    createdAt: "2026-10-27T16:00:00Z",
    updatedAt: "2026-10-29T11:00:00Z",
  },
  {
    id: "doc-3",
    title: "Task Lifecycle & Carry-Over SLA",
    category: "Product Ops",
    tags: ["tasks", "sla", "workflows", "operations"],
    content: "Tasks progress through: Pending -> In Progress -> Completed. If the due date passes before completion, the status automatically switches to Overdue. Carried-over tasks maintain an immutable audit trail showing origin meeting and carry-over dates.",
    author: "Marcus Vance",
    createdAt: "2026-10-29T09:15:00Z",
    updatedAt: "2026-10-29T09:15:00Z",
  },
];

const INITIAL_SETTINGS: WorkspaceSettings = {
  workspaceName: "DigiPlus Core Workspace",
  userName: "Alex Morgan",
  userEmail: "alex@digiplus.internal",
  claudeModel: "claude-3-5-sonnet-20241022",
  defaultMeetingDuration: 45,
  autoExtractTasks: true,
  emailNotifications: true,
};

function generateTimestampId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

function getInitialIsoDate(): string {
  return "2026-10-30T12:00:00Z";
}

const STORAGE_KEY = "digiplus_workspace_v1";

function readInitialStorage(): {
  meetings: Meeting[];
  tasks: Task[];
  knowledgeDocs: KnowledgeDocument[];
  settings: WorkspaceSettings;
} {
  if (typeof window === "undefined") {
    return {
      meetings: INITIAL_MEETINGS,
      tasks: INITIAL_TASKS,
      knowledgeDocs: INITIAL_DOCS,
      settings: INITIAL_SETTINGS,
    };
  }
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      return {
        meetings: parsed.meetings || INITIAL_MEETINGS,
        tasks: parsed.tasks || INITIAL_TASKS,
        knowledgeDocs: parsed.knowledgeDocs || INITIAL_DOCS,
        settings: parsed.settings || INITIAL_SETTINGS,
      };
    }
  } catch {
    // fallback
  }
  return {
    meetings: INITIAL_MEETINGS,
    tasks: INITIAL_TASKS,
    knowledgeDocs: INITIAL_DOCS,
    settings: INITIAL_SETTINGS,
  };
}

interface WorkspaceContextType {
  meetings: Meeting[];
  tasks: Task[];
  knowledgeDocs: KnowledgeDocument[];
  settings: WorkspaceSettings;
  stats: DashboardStats;
  addMeeting: (meeting: Omit<Meeting, "id" | "createdAt" | "updatedAt">) => Meeting;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "history">) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addKnowledgeDoc: (doc: Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">) => KnowledgeDocument;
  updateKnowledgeDoc: (id: string, updates: Partial<KnowledgeDocument>) => void;
  deleteKnowledgeDoc: (id: string) => void;
  updateSettings: (newSettings: Partial<WorkspaceSettings>) => void;
  generateCatchUpBrief: (meetingId: string) => string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(readInitialStorage);
  const [, startTransition] = useTransition();

  const { meetings, tasks, knowledgeDocs, settings } = data;

  // Persist to local storage on changes
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ meetings, tasks, knowledgeDocs, settings })
      );
    } catch {
      // Ignore quota errors
    }
  }, [meetings, tasks, knowledgeDocs, settings]);

  const stats: DashboardStats = {
    totalMeetings: meetings.length,
    totalTasks: tasks.length,
    pendingTasks: tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length,
    completedTasks: tasks.filter((t) => t.status === "completed").length,
    overdueTasks: tasks.filter((t) => t.status === "overdue").length,
    upcomingMeetingsCount: meetings.filter((m) => m.status === "scheduled").length,
  };

  const addMeeting = (meetingData: Omit<Meeting, "id" | "createdAt" | "updatedAt">): Meeting => {
    const nowIso = getInitialIsoDate();
    const newMeeting: Meeting = {
      ...meetingData,
      id: generateTimestampId("m"),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    startTransition(() => {
      setData((prev) => ({
        ...prev,
        meetings: [newMeeting, ...prev.meetings],
      }));
    });

    return newMeeting;
  };

  const updateMeeting = (id: string, updates: Partial<Meeting>) => {
    const nowIso = getInitialIsoDate();
    startTransition(() => {
      setData((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) =>
          m.id === id ? { ...m, ...updates, updatedAt: nowIso } : m
        ),
      }));
    });
  };

  const deleteMeeting = (id: string) => {
    startTransition(() => {
      setData((prev) => ({
        ...prev,
        meetings: prev.meetings.filter((m) => m.id !== id),
      }));
    });
  };

  const addTask = (taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "history">): Task => {
    const nowIso = getInitialIsoDate();
    const newTask: Task = {
      ...taskData,
      id: generateTimestampId("t"),
      createdAt: nowIso,
      updatedAt: nowIso,
      history: [
        {
          id: generateTimestampId("h"),
          timestamp: nowIso,
          action: "Task created",
          performedBy: settings.userName,
        },
      ],
    };

    startTransition(() => {
      setData((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
      }));
    });

    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const nowIso = getInitialIsoDate();
    startTransition(() => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id === id) {
            const newHistory = [...(t.history || [])];
            if (updates.status && updates.status !== t.status) {
              newHistory.push({
                id: generateTimestampId("h"),
                timestamp: nowIso,
                action: `Status changed to ${updates.status}`,
                performedBy: prev.settings.userName,
              });
            }
            return {
              ...t,
              ...updates,
              updatedAt: nowIso,
              history: newHistory,
            };
          }
          return t;
        }),
      }));
    });
  };

  const deleteTask = (id: string) => {
    startTransition(() => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
      }));
    });
  };

  const addKnowledgeDoc = (
    docData: Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">
  ): KnowledgeDocument => {
    const nowIso = getInitialIsoDate();
    const newDoc: KnowledgeDocument = {
      ...docData,
      id: generateTimestampId("doc"),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    startTransition(() => {
      setData((prev) => ({
        ...prev,
        knowledgeDocs: [newDoc, ...prev.knowledgeDocs],
      }));
    });

    return newDoc;
  };

  const updateKnowledgeDoc = (id: string, updates: Partial<KnowledgeDocument>) => {
    const nowIso = getInitialIsoDate();
    startTransition(() => {
      setData((prev) => ({
        ...prev,
        knowledgeDocs: prev.knowledgeDocs.map((d) =>
          d.id === id ? { ...d, ...updates, updatedAt: nowIso } : d
        ),
      }));
    });
  };

  const deleteKnowledgeDoc = (id: string) => {
    startTransition(() => {
      setData((prev) => ({
        ...prev,
        knowledgeDocs: prev.knowledgeDocs.filter((d) => d.id !== id),
      }));
    });
  };

  const updateSettings = (newSettings: Partial<WorkspaceSettings>) => {
    startTransition(() => {
      setData((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...newSettings },
      }));
    });
  };

  const generateCatchUpBrief = (meetingId: string): string => {
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return "Meeting not found.";

    const relatedTasks = tasks.filter((t) => t.meetingId === meetingId);
    const pendingMeetingTasks = relatedTasks.filter((t) => t.status !== "completed");
    const completedMeetingTasks = relatedTasks.filter((t) => t.status === "completed");

    return `AI CATCH-UP BRIEF: ${meeting.title}
Date: ${meeting.date} at ${meeting.time}
Status: ${meeting.status.toUpperCase()}

EXECUTIVE SUMMARY:
${meeting.aiSummary || meeting.notes || "No detailed notes recorded yet."}

KEY DECISIONS:
${meeting.decisions && meeting.decisions.length > 0 ? meeting.decisions.map((d) => `• ${d}`).join("\n") : "• No major decisions logged."}

ACTIVE & PENDING ACTION ITEMS (${pendingMeetingTasks.length}):
${pendingMeetingTasks.length > 0 ? pendingMeetingTasks.map((t) => `• [${t.priority.toUpperCase()}] ${t.title} -> ${t.owner} (Due: ${t.dueDate})`).join("\n") : "• All assigned tasks completed."}

COMPLETED ITEMS (${completedMeetingTasks.length}):
${completedMeetingTasks.length > 0 ? completedMeetingTasks.map((t) => `✓ ${t.title} (Owner: ${t.owner})`).join("\n") : "• No completed tasks yet."}

CARRY-OVER RECOMMENDATION:
${pendingMeetingTasks.length > 0 ? `Carry forward ${pendingMeetingTasks.length} pending items into the next sync.` : "All deliverables on schedule."}`;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        meetings,
        tasks,
        knowledgeDocs,
        settings,
        stats,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        addTask,
        updateTask,
        deleteTask,
        addKnowledgeDoc,
        updateKnowledgeDoc,
        deleteKnowledgeDoc,
        updateSettings,
        generateCatchUpBrief,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

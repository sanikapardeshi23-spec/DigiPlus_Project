"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import {
  Meeting,
  Task,
  KnowledgeDocument,
  WorkspaceSettings,
  DashboardStats,
  Priority,
  TaskStatus,
} from "@/types";
import {
  isSupabaseConfigured,
  fetchMeetingsFromDb,
  saveMeetingToDb,
  fetchActionItemsFromDb,
  updateActionItemStatusInDb,
  createActionItemInDb,
  fetchKnowledgeDocumentsFromDb,
  saveKnowledgeDocumentToDb,
  fetchDashboardStatsFromDb,
} from "@/lib/supabase/db";
import { logger } from "@/lib/logger";

const INITIAL_SETTINGS: WorkspaceSettings = {
  workspaceName: "DigiPlus Core Workspace",
  userName: "Alex Morgan",
  userEmail: "alex@digiplus.internal",
  claudeModel: "claude-3-5-sonnet-20241022",
  defaultMeetingDuration: 45,
  autoExtractTasks: true,
  emailNotifications: true,
};

const STORAGE_KEY = "digiplus_workspace_v2";

interface WorkspaceContextType {
  meetings: Meeting[];
  tasks: Task[];
  knowledgeDocs: KnowledgeDocument[];
  settings: WorkspaceSettings;
  stats: DashboardStats;
  isDbConnected: boolean;
  isLoadingDb: boolean;
  dbError: string | null;
  refreshData: () => Promise<void>;
  addMeeting: (meeting: Omit<Meeting, "id" | "createdAt" | "updatedAt">) => Promise<Meeting>;
  saveMeetingWithAiRecap: (params: {
    title: string;
    meetingDate?: string;
    agenda: string;
    participants: string;
    rawNotes: string;
    summary: string;
    decisions: string[];
    actionItems: Array<{
      title: string;
      description?: string | null;
      owner_name?: string | null;
      due_date?: string | null;
      priority: Priority;
      status: TaskStatus;
    }>;
  }) => Promise<string>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "history">) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => void;
  addKnowledgeDoc: (doc: Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">) => Promise<KnowledgeDocument>;
  updateKnowledgeDoc: (id: string, updates: Partial<KnowledgeDocument>) => void;
  deleteKnowledgeDoc: (id: string) => void;
  updateSettings: (newSettings: Partial<WorkspaceSettings>) => void;
  generateCatchUpBrief: (meetingId: string) => string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings>(INITIAL_SETTINGS);
  const [stats, setStats] = useState<DashboardStats>({
    totalMeetings: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    upcomingMeetingsCount: 0,
  });
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Load from Supabase (or fallback storage if credentials not provided)
  const refreshData = async () => {
    if (isSupabaseConfigured) {
      try {
        const [dbMeetings, dbTasks, dbDocs, dbStats] = await Promise.all([
          fetchMeetingsFromDb(),
          fetchActionItemsFromDb(),
          fetchKnowledgeDocumentsFromDb(),
          fetchDashboardStatsFromDb(),
        ]);

        startTransition(() => {
          setMeetings(dbMeetings);
          setTasks(dbTasks);
          setKnowledgeDocs(dbDocs);
          setIsLoadingDb(false);
          setDbError(null);
          if (dbStats) {
            setStats(dbStats);
          } else {
            // Compute from arrays
            setStats({
              totalMeetings: dbMeetings.length,
              totalTasks: dbTasks.length,
              pendingTasks: dbTasks.filter((t) => t.status === "pending" || t.status === "in_progress").length,
              completedTasks: dbTasks.filter((t) => t.status === "completed").length,
              overdueTasks: dbTasks.filter((t) => t.status === "overdue").length,
              upcomingMeetingsCount: dbMeetings.filter((m) => m.status === "scheduled").length,
            });
          }
        });
        logger.info("Loaded real data from Supabase PostgreSQL database");
      } catch (err: unknown) {
        const e = err as Error;
        logger.error({ err }, "Could not load data from Supabase");
        startTransition(() => {
          setDbError(e.message || "Failed to connect to Supabase");
          setIsLoadingDb(false);
        });
        loadFallbackStorage();
      }
    } else {
      loadFallbackStorage();
      startTransition(() => {
        setIsLoadingDb(false);
      });
    }
  };

  const loadFallbackStorage = () => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        startTransition(() => {
          if (parsed.meetings) setMeetings(parsed.meetings);
          if (parsed.tasks) setTasks(parsed.tasks);
          if (parsed.knowledgeDocs) setKnowledgeDocs(parsed.knowledgeDocs);
          if (parsed.settings) setSettings(parsed.settings);
          computeStats(parsed.meetings || [], parsed.tasks || []);
        });
      }
    } catch {
      // Empty fallback
    }
  };

  const computeStats = (mList: Meeting[], tList: Task[]) => {
    setStats({
      totalMeetings: mList.length,
      totalTasks: tList.length,
      pendingTasks: tList.filter((t) => t.status === "pending" || t.status === "in_progress").length,
      completedTasks: tList.filter((t) => t.status === "completed").length,
      overdueTasks: tList.filter((t) => t.status === "overdue").length,
      upcomingMeetingsCount: mList.filter((m) => m.status === "scheduled").length,
    });
  };

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await refreshData();
      }
    };
    run();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to local storage as client backup
  useEffect(() => {
    if (meetings.length > 0 || tasks.length > 0) {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ meetings, tasks, knowledgeDocs, settings })
        );
      } catch {
        // storage quota
      }
    }
  }, [meetings, tasks, knowledgeDocs, settings]);

  // Recalculate stats whenever meetings or tasks change
  useEffect(() => {
    computeStats(meetings, tasks);
  }, [meetings, tasks]);

  // Save full meeting with AI recap to Supabase
  const saveMeetingWithAiRecap = async (params: {
    title: string;
    meetingDate?: string;
    agenda: string;
    participants: string;
    rawNotes: string;
    summary: string;
    decisions: string[];
    actionItems: Array<{
      title: string;
      description?: string | null;
      owner_name?: string | null;
      due_date?: string | null;
      priority: Priority;
      status: TaskStatus;
    }>;
  }): Promise<string> => {
    let meetingId = generateId("m");

    if (isSupabaseConfigured) {
      const res = await saveMeetingToDb({
        title: params.title,
        meetingDate: params.meetingDate || new Date().toISOString(),
        agenda: params.agenda,
        participants: params.participants,
        rawNotes: params.rawNotes,
        summary: params.summary,
        decisions: params.decisions,
        actionItems: params.actionItems.map((a) => ({
          title: a.title,
          description: a.description,
          ownerName: a.owner_name,
          dueDate: a.due_date,
          priority: a.priority,
          status: a.status,
        })),
      });
      meetingId = res.meetingId;
      await refreshData();
      return meetingId;
    }

    // In-memory fallback
    const participantList = params.participants
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@digiplus.internal`,
      }));

    const newMeeting: Meeting = {
      id: meetingId,
      title: params.title,
      date: params.meetingDate ? params.meetingDate.split("T")[0] : new Date().toISOString().split("T")[0],
      time: "10:00 AM",
      durationMinutes: 45,
      location: "Virtual Room",
      status: "completed",
      participants: participantList.length > 0 ? participantList : [{ name: settings.userName }],
      agenda: params.agenda,
      notes: params.rawNotes,
      rawNotes: params.rawNotes,
      aiSummary: params.summary,
      summary: params.summary,
      decisions: params.decisions,
      actionItems: params.actionItems.map((a) =>
        a.owner_name ? `${a.title} (${a.owner_name})` : a.title
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newTasks: Task[] = params.actionItems.map((a, idx) => ({
      id: generateId("t"),
      title: a.title,
      description: a.description || undefined,
      owner: a.owner_name || settings.userName,
      dueDate: a.due_date || new Date(Date.now() + (idx + 3) * 86400000).toISOString().split("T")[0],
      priority: a.priority,
      status: a.status,
      meetingId,
      meetingTitle: params.title,
      carriedOver: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    startTransition(() => {
      setMeetings((prev) => [newMeeting, ...prev]);
      setTasks((prev) => [...newTasks, ...prev]);
    });

    return meetingId;
  };

  const addMeeting = async (
    data: Omit<Meeting, "id" | "createdAt" | "updatedAt">
  ): Promise<Meeting> => {
    let meetingId = generateId("m");

    if (isSupabaseConfigured) {
      try {
        const participantStr = data.participants.map((p) => p.name).join(", ");
        const res = await saveMeetingToDb({
          title: data.title,
          meetingDate: `${data.date}T10:00:00Z`,
          agenda: data.agenda,
          participants: participantStr,
          rawNotes: data.notes || data.rawNotes || "",
          summary: data.aiSummary || data.summary,
          decisions: data.decisions,
        });
        meetingId = res.meetingId;
        await refreshData();
      } catch (err) {
        logger.error({ err }, "Could not save meeting to Supabase");
      }
    }

    const newMeeting: Meeting = {
      ...data,
      id: meetingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) {
      startTransition(() => {
        setMeetings((prev) => [newMeeting, ...prev]);
      });
    }

    return newMeeting;
  };

  const updateMeeting = (id: string, updates: Partial<Meeting>) => {
    startTransition(() => {
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
        )
      );
    });
  };

  const deleteMeeting = (id: string) => {
    startTransition(() => {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    });
  };

  const addTask = async (
    taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "history">
  ): Promise<Task> => {
    if (isSupabaseConfigured) {
      try {
        const created = await createActionItemInDb({
          title: taskData.title,
          description: taskData.description,
          ownerName: taskData.owner,
          dueDate: taskData.dueDate,
          priority: taskData.priority,
          status: taskData.status,
          meetingId: taskData.meetingId,
        });
        await refreshData();
        return created;
      } catch (err) {
        logger.error({ err }, "Could not save task to Supabase");
      }
    }

    const newTask: Task = {
      ...taskData,
      id: generateId("t"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: generateId("h"),
          timestamp: new Date().toISOString(),
          action: "Task created",
          performedBy: settings.userName,
        },
      ],
    };

    startTransition(() => {
      setTasks((prev) => [newTask, ...prev]);
    });

    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
    if (isSupabaseConfigured && updates.status) {
      try {
        await updateActionItemStatusInDb(id, updates.status);
      } catch (err) {
        logger.error({ err }, "Could not update task status in Supabase");
      }
    }

    startTransition(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const newHistory = [...(t.history || [])];
            if (updates.status && updates.status !== t.status) {
              newHistory.push({
                id: generateId("h"),
                timestamp: new Date().toISOString(),
                action: `Status changed to ${updates.status}`,
                performedBy: settings.userName,
              });
            }
            return {
              ...t,
              ...updates,
              updatedAt: new Date().toISOString(),
              history: newHistory,
            };
          }
          return t;
        })
      );
    });
  };

  const deleteTask = (id: string) => {
    startTransition(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    });
  };

  const addKnowledgeDoc = async (
    docData: Omit<KnowledgeDocument, "id" | "createdAt" | "updatedAt">
  ): Promise<KnowledgeDocument> => {
    if (isSupabaseConfigured) {
      try {
        const created = await saveKnowledgeDocumentToDb({
          title: docData.title,
          content: docData.content,
          category: docData.category,
        });
        await refreshData();
        return created;
      } catch (err) {
        logger.error({ err }, "Could not save knowledge document to Supabase");
      }
    }

    const newDoc: KnowledgeDocument = {
      ...docData,
      id: generateId("doc"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    startTransition(() => {
      setKnowledgeDocs((prev) => [newDoc, ...prev]);
    });

    return newDoc;
  };

  const updateKnowledgeDoc = (id: string, updates: Partial<KnowledgeDocument>) => {
    startTransition(() => {
      setKnowledgeDocs((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
        )
      );
    });
  };

  const deleteKnowledgeDoc = (id: string) => {
    startTransition(() => {
      setKnowledgeDocs((prev) => prev.filter((d) => d.id !== id));
    });
  };

  const updateSettings = (newSettings: Partial<WorkspaceSettings>) => {
    startTransition(() => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
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
${meeting.aiSummary || meeting.summary || meeting.notes || "No detailed notes recorded yet."}

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
        isDbConnected: isSupabaseConfigured,
        isLoadingDb,
        dbError,
        refreshData,
        addMeeting,
        saveMeetingWithAiRecap,
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

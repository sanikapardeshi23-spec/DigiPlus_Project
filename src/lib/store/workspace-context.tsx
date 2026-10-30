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
  updateActionItemInDb,
  deleteActionItemInDb,
  carryForwardTasksInDb,
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
  openaiModel: "gpt-4.1-mini",
  claudeModel: "gpt-4.1-mini",
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
    carryForwardTaskIds?: string[];
  }) => Promise<string>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "history">) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  carryForwardTasks: (taskIds: string[], targetMeetingId: string) => Promise<void>;
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
    carryForwardTaskIds?: string[];
  }): Promise<string> => {
    let meetingId = generateId("m");

    // Guard against carry-forward of completed tasks or non-existent tasks
    const eligibleCarryForwardIds = (params.carryForwardTaskIds || []).filter((id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return false;
      if (task.status === "completed") {
        logger.system("validation_failure", {
          reason: "Cannot carry forward completed task",
          taskId: id,
          title: task.title,
        });
        return false;
      }
      return true;
    });

    if (isSupabaseConfigured) {
      try {
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

        // Handle carry forward tasks if any were selected
        if (eligibleCarryForwardIds.length > 0) {
          await carryForwardTasksInDb({
            taskIds: eligibleCarryForwardIds,
            targetMeetingId: meetingId,
            targetMeetingTitle: params.title,
            performedBy: settings.userName,
          });
        }

        logger.meeting("meeting_created", {
          meetingId,
          title: params.title,
          actionItemsCount: params.actionItems.length,
          decisionsCount: params.decisions.length,
          carriedCount: eligibleCarryForwardIds.length,
          status: "success",
        });

        if (params.summary) {
          logger.meeting("ai_summary_generated", {
            meetingId,
            title: params.title,
            summaryLength: params.summary.length,
          });
        }

        await refreshData();
        return meetingId;
      } catch (err: unknown) {
        const error = err as Error;
        logger.system("database_error", {
          operation: "saveMeetingWithAiRecap",
          message: error.message,
        });
        throw err;
      }
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

    const newTasks: Task[] = params.actionItems.map((a, idx) => {
      const taskId = generateId("t");
      logger.task("task_created", {
        taskId,
        title: a.title,
        owner: a.owner_name || settings.userName,
        priority: a.priority,
        status: a.status,
        meetingId,
      });

      return {
        id: taskId,
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
        history: [
          {
            id: generateId("h"),
            timestamp: new Date().toISOString(),
            action: "Task created from meeting",
            details: `Created during meeting: ${params.title}`,
            performedBy: a.owner_name || settings.userName,
          },
        ],
      };
    });

    startTransition(() => {
      setMeetings((prev) => [newMeeting, ...prev]);
      setTasks((prev) => {
        let updated = [...newTasks, ...prev];
        if (eligibleCarryForwardIds.length > 0) {
          updated = updated.map((t) => {
            if (eligibleCarryForwardIds.includes(t.id)) {
              logger.task("task_carried_forward", {
                taskId: t.id,
                title: t.title,
                targetMeetingId: meetingId,
                targetMeetingTitle: params.title,
              });

              return {
                ...t,
                originalMeetingId: t.originalMeetingId || t.meetingId,
                originalMeetingTitle: t.originalMeetingTitle || t.meetingTitle,
                meetingId,
                meetingTitle: params.title,
                carriedOver: true,
                history: [
                  ...(t.history || []),
                  {
                    id: generateId("h"),
                    timestamp: new Date().toISOString(),
                    action: "Task carried forward to another meeting",
                    details: `Carried forward into "${params.title}"`,
                    performedBy: settings.userName,
                  },
                ],
              };
            }
            return t;
          });
        }
        return updated;
      });
    });

    logger.meeting("meeting_created", {
      meetingId,
      title: params.title,
      mode: "in-memory-fallback",
      status: "success",
    });

    if (params.summary) {
      logger.meeting("ai_summary_generated", {
        meetingId,
        title: params.title,
      });
    }

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
      } catch (err: unknown) {
        const error = err as Error;
        logger.system("database_error", { operation: "addMeeting", message: error.message });
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

    logger.meeting("meeting_created", {
      meetingId,
      title: data.title,
      date: data.date,
    });

    return newMeeting;
  };

  const updateMeeting = (id: string, updates: Partial<Meeting>) => {
    const existing = meetings.find((m) => m.id === id);

    startTransition(() => {
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
        )
      );
    });

    if (updates.notes !== undefined || updates.rawNotes !== undefined) {
      logger.meeting("transcript_saved", {
        meetingId: id,
        title: existing?.title || "Meeting",
        notesLength: (updates.notes || updates.rawNotes || "").length,
      });
    } else {
      logger.meeting("meeting_updated", {
        meetingId: id,
        title: existing?.title,
        updatedFields: Object.keys(updates),
      });
    }
  };

  const deleteMeeting = (id: string) => {
    const target = meetings.find((m) => m.id === id);

    startTransition(() => {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    });

    logger.meeting("meeting_deleted", {
      meetingId: id,
      title: target?.title,
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

        logger.task("task_created", {
          taskId: created.id,
          title: taskData.title,
          owner: taskData.owner,
          priority: taskData.priority,
          status: taskData.status,
          meetingId: taskData.meetingId,
        });

        await refreshData();
        return created;
      } catch (err: unknown) {
        const error = err as Error;
        logger.system("database_error", { operation: "addTask", message: error.message });
      }
    }

    const taskId = generateId("t");
    const newTask: Task = {
      ...taskData,
      id: taskId,
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

    logger.task("task_created", {
      taskId,
      title: taskData.title,
      owner: taskData.owner,
      priority: taskData.priority,
      status: taskData.status,
      meetingId: taskData.meetingId,
    });

    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
    const existingTask = tasks.find((t) => t.id === id);

    // Identify and log task events
    if (existingTask) {
      if (updates.status && updates.status !== existingTask.status) {
        if (updates.status === "completed") {
          logger.task("task_completed", {
            taskId: id,
            title: existingTask.title,
            owner: existingTask.owner,
          });
        } else if (existingTask.status === "completed") {
          logger.task("task_reopened", {
            taskId: id,
            title: existingTask.title,
            newStatus: updates.status,
          });
        }
      }

      if (updates.owner && updates.owner !== existingTask.owner) {
        logger.task("task_reassigned", {
          taskId: id,
          title: existingTask.title,
          previousOwner: existingTask.owner,
          newOwner: updates.owner,
        });
      }

      if (
        (updates.title && updates.title !== existingTask.title) ||
        (updates.dueDate && updates.dueDate !== existingTask.dueDate) ||
        (updates.priority && updates.priority !== existingTask.priority)
      ) {
        logger.task("task_updated", {
          taskId: id,
          title: updates.title || existingTask.title,
          updatedFields: Object.keys(updates),
        });
      }
    }

    if (isSupabaseConfigured) {
      try {
        await updateActionItemInDb(
          id,
          {
            title: updates.title,
            description: updates.description,
            ownerName: updates.owner,
            dueDate: updates.dueDate,
            priority: updates.priority,
            status: updates.status,
            meetingId: updates.meetingId,
            outcome: updates.outcome,
          },
          existingTask,
          settings.userName
        );
        await refreshData();
        return;
      } catch (err: unknown) {
        const error = err as Error;
        logger.system("database_error", { operation: "updateTask", message: error.message });
      }
    }

    startTransition(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const newHistory = [...(t.history || [])];
            if (updates.status && updates.status !== t.status) {
              const actionLabel =
                updates.status === "completed"
                  ? "Task completed"
                  : t.status === "completed"
                    ? "Task reopened"
                    : `Status changed to ${updates.status}`;
              newHistory.push({
                id: generateId("h"),
                timestamp: new Date().toISOString(),
                action: actionLabel,
                details: updates.outcome || undefined,
                performedBy: settings.userName,
              });
            }
            if (updates.owner && updates.owner !== t.owner) {
              newHistory.push({
                id: generateId("h"),
                timestamp: new Date().toISOString(),
                action: "Owner changed",
                details: `Reassigned from ${t.owner} to ${updates.owner}`,
                performedBy: settings.userName,
              });
            }
            if (updates.dueDate && updates.dueDate !== t.dueDate) {
              newHistory.push({
                id: generateId("h"),
                timestamp: new Date().toISOString(),
                action: "Due date changed",
                details: `Changed from ${t.dueDate} to ${updates.dueDate}`,
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

  const deleteTask = async (id: string): Promise<void> => {
    const target = tasks.find((t) => t.id === id);

    if (isSupabaseConfigured) {
      try {
        await deleteActionItemInDb(id);
        await refreshData();
        logger.task("task_updated", { taskId: id, action: "deleted", title: target?.title });
        return;
      } catch (err: unknown) {
        const error = err as Error;
        logger.system("database_error", { operation: "deleteTask", message: error.message });
      }
    }

    startTransition(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    });

    logger.task("task_updated", { taskId: id, action: "deleted", title: target?.title });
  };

  const carryForwardTasks = async (taskIds: string[], targetMeetingId: string): Promise<void> => {
    const targetMeeting = meetings.find((m) => m.id === targetMeetingId);
    const targetTitle = targetMeeting?.title || "Upcoming Meeting";

    // Strict validation: Reject completed tasks & duplicate carry-forwards
    const validTaskIds: string[] = [];
    for (const id of taskIds) {
      const task = tasks.find((t) => t.id === id);
      if (!task) continue;

      if (task.status === "completed") {
        logger.system("validation_failure", {
          reason: "Cannot carry forward completed task",
          taskId: id,
          title: task.title,
        });
        continue;
      }

      if (task.meetingId === targetMeetingId) {
        logger.system("validation_failure", {
          reason: "Task already associated with this meeting",
          taskId: id,
          title: task.title,
          targetMeetingId,
        });
        continue;
      }

      validTaskIds.push(id);
    }

    if (validTaskIds.length === 0) {
      return;
    }

    if (isSupabaseConfigured) {
      try {
        await carryForwardTasksInDb({
          taskIds: validTaskIds,
          targetMeetingId,
          targetMeetingTitle: targetTitle,
          performedBy: settings.userName,
        });

        for (const id of validTaskIds) {
          const task = tasks.find((t) => t.id === id);
          logger.task("task_carried_forward", {
            taskId: id,
            title: task?.title,
            targetMeetingId,
            targetMeetingTitle: targetTitle,
          });
        }

        await refreshData();
        return;
      } catch (err: unknown) {
        const error = err as Error;
        logger.system("database_error", { operation: "carryForwardTasks", message: error.message });
      }
    }

    startTransition(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (validTaskIds.includes(t.id) && t.status !== "completed") {
            const originalMeetingId = t.originalMeetingId || t.meetingId;
            const originalMeetingTitle = t.originalMeetingTitle || t.meetingTitle;
            const newHistory = [
              ...(t.history || []),
              {
                id: generateId("h"),
                timestamp: new Date().toISOString(),
                action: "Task carried forward to another meeting",
                details: `Carried forward into "${targetTitle}"`,
                performedBy: settings.userName,
              },
            ];

            logger.task("task_carried_forward", {
              taskId: t.id,
              title: t.title,
              targetMeetingId,
              targetMeetingTitle: targetTitle,
            });

            return {
              ...t,
              meetingId: targetMeetingId,
              meetingTitle: targetTitle,
              originalMeetingId,
              originalMeetingTitle,
              carriedOver: true,
              history: newHistory,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );
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
      } catch (err: unknown) {
        const error = err as Error;
        logger.system("database_error", { operation: "addKnowledgeDoc", message: error.message });
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
        carryForwardTasks,
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

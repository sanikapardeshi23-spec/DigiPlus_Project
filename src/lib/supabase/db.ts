import { supabase, isSupabaseConfigured } from "./client";
import { logger } from "@/lib/logger";
import {
  DbMeeting,
  DbDecision,
  DbActionItem,
  DbTaskHistory,
  DbKnowledgeDocument,
  Meeting,
  Task,
  TaskHistoryItem,
  KnowledgeDocument,
  DashboardStats,
  TaskStatus,
  Priority,
} from "@/types";

export { isSupabaseConfigured };

// 1. Fetch All Meetings with their decisions and action items from Supabase
export async function fetchMeetingsFromDb(): Promise<Meeting[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data: meetings, error: mError } = await supabase
      .from("meetings")
      .select("*")
      .order("meeting_date", { ascending: false });

    if (mError) throw mError;
    if (!meetings || meetings.length === 0) return [];

    const meetingIds = meetings.map((m: DbMeeting) => m.id);

    // Fetch related decisions
    const { data: decisions, error: dError } = await supabase
      .from("decisions")
      .select("*")
      .in("meeting_id", meetingIds);

    if (dError) logger.warn({ dError }, "Error fetching decisions from Supabase");

    // Fetch related action items
    const { data: actionItems, error: aError } = await supabase
      .from("action_items")
      .select("*")
      .in("meeting_id", meetingIds);

    if (aError) logger.warn({ aError }, "Error fetching action items from Supabase");

    return meetings.map((m: DbMeeting) => {
      const mDecisions = (decisions || [])
        .filter((d: DbDecision) => d.meeting_id === m.id)
        .map((d: DbDecision) => d.decision_text);

      const mActions = (actionItems || [])
        .filter((a: DbActionItem) => a.meeting_id === m.id)
        .map((a: DbActionItem) =>
          a.owner_name ? `${a.title} (${a.owner_name})` : a.title
        );

      const participantList = m.participants
        ? m.participants.split(",").map((p) => {
          const name = p.trim();
          return {
            name,
            email: `${name.toLowerCase().replace(/\s+/g, ".")}@digiplus.internal`,
          };
        })
        : [{ name: "Alex Morgan" }];

      const mDateObj = new Date(m.meeting_date);
      const dateStr = !isNaN(mDateObj.getTime())
        ? mDateObj.toISOString().split("T")[0]
        : "2026-11-02";

      return {
        id: m.id,
        title: m.title,
        date: dateStr,
        time: "10:00 AM",
        durationMinutes: 45,
        location: "Virtual Room",
        status: m.summary ? "completed" : "scheduled",
        participants: participantList,
        agenda: m.agenda || "",
        notes: m.raw_notes || "",
        rawNotes: m.raw_notes || "",
        aiSummary: m.summary || undefined,
        summary: m.summary || undefined,
        decisions: mDecisions,
        actionItems: mActions,
        createdAt: m.created_at,
        updatedAt: m.created_at,
      };
    });
  } catch (err) {
    logger.error({ err }, "Database: Failed to fetch meetings from Supabase");
    throw err;
  }
}

// 2. Save a Meeting with its Decisions and Action Items in Supabase
export async function saveMeetingToDb(params: {
  title: string;
  meetingDate?: string;
  agenda: string;
  participants: string;
  rawNotes: string;
  summary?: string;
  decisions?: string[];
  actionItems?: Array<{
    title: string;
    description?: string | null;
    ownerName?: string | null;
    dueDate?: string | null;
    priority?: Priority;
    status?: TaskStatus;
  }>;
}): Promise<{ meetingId: string; success: boolean }> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }

  try {
    const meetingDate = params.meetingDate || new Date().toISOString();

    // Insert meeting record
    const { data: meeting, error: mError } = await supabase
      .from("meetings")
      .insert({
        title: params.title,
        meeting_date: meetingDate,
        agenda: params.agenda || "",
        participants: params.participants || "",
        raw_notes: params.rawNotes || "",
        summary: params.summary || null,
      })
      .select("id")
      .single();

    if (mError) throw mError;
    const meetingId = meeting.id;

    // Insert decisions if any
    if (params.decisions && params.decisions.length > 0) {
      const decisionRows = params.decisions
        .filter((d) => Boolean(d && d.trim()))
        .map((text) => ({
          meeting_id: meetingId,
          decision_text: text.trim(),
        }));

      if (decisionRows.length > 0) {
        const { error: dError } = await supabase.from("decisions").insert(decisionRows);
        if (dError) logger.warn({ dError }, "Error inserting decisions into Supabase");
      }
    }

    // Insert action items if any
    if (params.actionItems && params.actionItems.length > 0) {
      const actionRows = params.actionItems
        .filter((a) => Boolean(a.title && a.title.trim()))
        .map((a) => ({
          meeting_id: meetingId,
          title: a.title.trim(),
          description: a.description || null,
          owner_name: a.ownerName || null,
          due_date: a.dueDate || null,
          priority: a.priority || "medium",
          status: a.status || "pending",
        }));

      if (actionRows.length > 0) {
        const { data: insertedItems, error: aError } = await supabase
          .from("action_items")
          .insert(actionRows)
          .select("id, title, owner_name, created_at");

        if (aError) {
          logger.warn({ aError }, "Error inserting action items into Supabase");
        } else if (insertedItems && insertedItems.length > 0) {
          // Log initial history for each extracted task
          const historyRows = insertedItems.map((item) => ({
            task_id: item.id,
            action: "Task created from meeting",
            details: `Created during meeting: ${params.title}`,
            performed_by: item.owner_name || "System",
            created_at: item.created_at,
          }));
          await supabase.from("task_history").insert(historyRows);
        }
      }
    }

    logger.info({ meetingId }, "Successfully saved meeting with decisions & action items to Supabase");
    return { meetingId, success: true };
  } catch (err) {
    logger.error({ err }, "Database: Failed to save meeting to Supabase");
    throw err;
  }
}

// 3. Fetch Action Items (Tasks) with complete History & Meeting references from Supabase
export async function fetchActionItemsFromDb(): Promise<Task[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data: items, error } = await supabase
      .from("action_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!items || items.length === 0) return [];

    const itemIds = items.map((i: DbActionItem) => i.id);

    // Fetch related task history
    const { data: historyList, error: hError } = await supabase
      .from("task_history")
      .select("*")
      .in("task_id", itemIds)
      .order("created_at", { ascending: false });

    if (hError) {
      logger.warn({ hError }, "Error fetching task history from Supabase");
    }

    // Fetch meetings to resolve meeting titles
    const meetingIds = Array.from(
      new Set(
        items
          .flatMap((i: DbActionItem) => [i.meeting_id, i.original_meeting_id])
          .filter((id): id is string => Boolean(id))
      )
    );

    const meetingTitleMap = new Map<string, string>();
    if (meetingIds.length > 0) {
      const { data: meetingsData } = await supabase
        .from("meetings")
        .select("id, title")
        .in("id", meetingIds);

      if (meetingsData) {
        meetingsData.forEach((m: { id: string; title: string }) => {
          meetingTitleMap.set(m.id, m.title);
        });
      }
    }

    return items.map((item: DbActionItem) => {
      const itemHistory: TaskHistoryItem[] = (historyList || [])
        .filter((h: DbTaskHistory) => h.task_id === item.id)
        .map((h: DbTaskHistory) => ({
          id: h.id,
          taskId: h.task_id,
          timestamp: h.created_at,
          action: h.action,
          details: h.details || undefined,
          performedBy: h.performed_by,
        }));

      // Fallback if no history recorded yet
      if (itemHistory.length === 0) {
        itemHistory.push({
          id: `h-init-${item.id}`,
          taskId: item.id,
          timestamp: item.created_at,
          action: "Task created",
          details: "Task initialized in DigiPlus workspace",
          performedBy: item.owner_name || "System",
        });
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        owner: item.owner_name || "Unassigned",
        ownerEmail: item.owner_name
          ? `${item.owner_name.toLowerCase().replace(/\s+/g, ".")}@digiplus.internal`
          : undefined,
        dueDate: item.due_date || new Date().toISOString().split("T")[0],
        priority: item.priority as Priority,
        status: item.status as TaskStatus,
        meetingId: item.meeting_id || undefined,
        meetingTitle: item.meeting_id ? meetingTitleMap.get(item.meeting_id) : undefined,
        originalMeetingId: item.original_meeting_id || undefined,
        originalMeetingTitle: item.original_meeting_id
          ? meetingTitleMap.get(item.original_meeting_id)
          : undefined,
        outcome: item.outcome || undefined,
        carriedOver: Boolean(item.carried_over),
        createdAt: item.created_at,
        updatedAt: item.updated_at || item.created_at,
        history: itemHistory,
      };
    });
  } catch (err) {
    logger.error({ err }, "Database: Failed to fetch action items from Supabase");
    throw err;
  }
}

// 4. Create Standalone Action Item in Supabase with Audit History
export async function createActionItemInDb(params: {
  title: string;
  description?: string;
  ownerName?: string;
  dueDate?: string;
  priority?: Priority;
  status?: TaskStatus;
  meetingId?: string;
  outcome?: string;
  performedBy?: string;
}): Promise<Task> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  try {
    const { data, error } = await supabase
      .from("action_items")
      .insert({
        title: params.title,
        description: params.description || null,
        owner_name: params.ownerName || null,
        due_date: params.dueDate || null,
        priority: params.priority || "medium",
        status: params.status || "pending",
        meeting_id: params.meetingId || null,
        outcome: params.outcome || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    // Record initial creation history
    const historyEntry = {
      task_id: data.id,
      action: "Task created",
      details: params.meetingId ? "Created and linked to meeting" : "Direct task created",
      performed_by: params.performedBy || params.ownerName || "Alex Morgan",
    };

    const { data: createdHistory } = await supabase
      .from("task_history")
      .insert(historyEntry)
      .select("*")
      .single();

    let meetingTitle: string | undefined = undefined;
    if (params.meetingId) {
      const { data: mData } = await supabase
        .from("meetings")
        .select("title")
        .eq("id", params.meetingId)
        .single();
      if (mData) meetingTitle = mData.title;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description || undefined,
      owner: data.owner_name || "Unassigned",
      ownerEmail: data.owner_name
        ? `${data.owner_name.toLowerCase().replace(/\s+/g, ".")}@digiplus.internal`
        : undefined,
      dueDate: data.due_date || new Date().toISOString().split("T")[0],
      priority: data.priority as Priority,
      status: data.status as TaskStatus,
      meetingId: data.meeting_id || undefined,
      meetingTitle,
      outcome: data.outcome || undefined,
      carriedOver: false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      history: [
        {
          id: createdHistory?.id || `h-${data.id}`,
          taskId: data.id,
          timestamp: createdHistory?.created_at || data.created_at,
          action: "Task created",
          details: historyEntry.details,
          performedBy: historyEntry.performed_by,
        },
      ],
    };
  } catch (err) {
    logger.error({ err }, "Database: Failed to create action item in Supabase");
    throw err;
  }
}

// 5. Update Action Item in Supabase with Detailed Audit History
export async function updateActionItemInDb(
  id: string,
  updates: {
    title?: string;
    description?: string;
    ownerName?: string;
    dueDate?: string;
    priority?: Priority;
    status?: TaskStatus;
    meetingId?: string | null;
    outcome?: string | null;
  },
  existingTask?: Task,
  performedBy: string = "Alex Morgan"
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.description !== undefined) updatePayload.description = updates.description || null;
    if (updates.ownerName !== undefined) updatePayload.owner_name = updates.ownerName || null;
    if (updates.dueDate !== undefined) updatePayload.due_date = updates.dueDate || null;
    if (updates.priority !== undefined) updatePayload.priority = updates.priority;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.meetingId !== undefined) updatePayload.meeting_id = updates.meetingId;
    if (updates.outcome !== undefined) updatePayload.outcome = updates.outcome;

    const { error } = await supabase
      .from("action_items")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw error;

    // Generate audit history events
    const historyEvents: Array<{ action: string; details?: string }> = [];

    if (existingTask) {
      if (updates.ownerName && updates.ownerName !== existingTask.owner) {
        historyEvents.push({
          action: "Owner changed",
          details: `Reassigned from ${existingTask.owner} to ${updates.ownerName}`,
        });
      }

      if (updates.dueDate && updates.dueDate !== existingTask.dueDate) {
        historyEvents.push({
          action: "Due date changed",
          details: `Changed from ${existingTask.dueDate} to ${updates.dueDate}`,
        });
      }

      if (updates.status && updates.status !== existingTask.status) {
        if (updates.status === "completed") {
          historyEvents.push({
            action: "Task completed",
            details: updates.outcome || existingTask.outcome || "Completed successfully",
          });
        } else if (existingTask.status === "completed") {
          historyEvents.push({
            action: "Task reopened",
            details: `Reopened with status: ${updates.status}`,
          });
        } else {
          historyEvents.push({
            action: "Status changed",
            details: `Status changed from ${existingTask.status} to ${updates.status}`,
          });
        }
      }

      if (
        updates.outcome !== undefined &&
        updates.outcome !== existingTask.outcome &&
        (!updates.status || updates.status === existingTask.status)
      ) {
        historyEvents.push({
          action: "Outcome updated",
          details: updates.outcome || "Outcome cleared",
        });
      }
    } else if (updates.status) {
      historyEvents.push({
        action: updates.status === "completed" ? "Task completed" : "Status changed",
        details: `Status set to ${updates.status}`,
      });
    }

    if (historyEvents.length > 0) {
      const historyRows = historyEvents.map((evt) => ({
        task_id: id,
        action: evt.action,
        details: evt.details || null,
        performed_by: performedBy,
        created_at: new Date().toISOString(),
      }));

      await supabase.from("task_history").insert(historyRows);
    }

    logger.info({ id, historyCount: historyEvents.length }, "Updated action item and appended history in Supabase");
  } catch (err) {
    logger.error({ err, id }, "Database: Failed to update action item in Supabase");
    throw err;
  }
}

// 6. Update Action Item Status Convenience Method
export async function updateActionItemStatusInDb(
  id: string,
  status: TaskStatus,
  existingTask?: Task,
  performedBy: string = "Alex Morgan"
): Promise<void> {
  return updateActionItemInDb(id, { status }, existingTask, performedBy);
}

// 7. Delete Action Item from Supabase (Cascade removes history)
export async function deleteActionItemInDb(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from("action_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
    logger.info({ id }, "Deleted action item from Supabase");
  } catch (err) {
    logger.error({ err, id }, "Database: Failed to delete action item from Supabase");
    throw err;
  }
}

// 8. Carry Forward Open Tasks into a New Meeting
export async function carryForwardTasksInDb(params: {
  taskIds: string[];
  targetMeetingId: string;
  targetMeetingTitle: string;
  performedBy?: string;
}): Promise<void> {
  if (!isSupabaseConfigured || params.taskIds.length === 0) return;

  try {
    // 1. Fetch current tasks to check original meeting IDs and ensure only open/in_progress tasks
    const { data: currentTasks, error: fError } = await supabase
      .from("action_items")
      .select("id, meeting_id, original_meeting_id, status, title")
      .in("id", params.taskIds);

    if (fError) throw fError;
    if (!currentTasks || currentTasks.length === 0) return;

    // Filter strictly for open / pending / in_progress tasks (never completed)
    const eligibleTasks = currentTasks.filter(
      (t) => t.status === "open" || t.status === "pending" || t.status === "in_progress" || t.status === "overdue"
    );

    for (const task of eligibleTasks) {
      const origMeetingId = task.original_meeting_id || task.meeting_id;

      await supabase
        .from("action_items")
        .update({
          meeting_id: params.targetMeetingId,
          original_meeting_id: origMeetingId,
          carried_over: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      // Record immutable task history
      await supabase.from("task_history").insert({
        task_id: task.id,
        action: "Task carried forward to another meeting",
        details: `Carried forward into "${params.targetMeetingTitle}"`,
        performed_by: params.performedBy || "Alex Morgan",
        created_at: new Date().toISOString(),
      });
    }

    logger.info(
      { count: eligibleTasks.length, targetMeetingId: params.targetMeetingId },
      "Successfully carried forward tasks in Supabase"
    );
  } catch (err) {
    logger.error({ err }, "Database: Failed to carry forward tasks in Supabase");
    throw err;
  }
}

// 6. Fetch Knowledge Documents from Supabase
export async function fetchKnowledgeDocumentsFromDb(): Promise<KnowledgeDocument[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((d: DbKnowledgeDocument) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      tags: [d.category.toLowerCase()],
      content: d.content,
      author: "Team",
      createdAt: d.created_at,
      updatedAt: d.created_at,
    }));
  } catch (err) {
    logger.error({ err }, "Database: Failed to fetch knowledge documents from Supabase");
    throw err;
  }
}

// 7. Save Knowledge Document to Supabase
export async function saveKnowledgeDocumentToDb(params: {
  title: string;
  content: string;
  category: string;
}): Promise<KnowledgeDocument> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  try {
    const { data, error } = await supabase
      .from("knowledge_documents")
      .insert({
        title: params.title,
        content: params.content,
        category: params.category || "General",
      })
      .select("*")
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      category: data.category,
      tags: [data.category.toLowerCase()],
      content: data.content,
      author: "Team",
      createdAt: data.created_at,
      updatedAt: data.created_at,
    };
  } catch (err) {
    logger.error({ err }, "Database: Failed to save knowledge document to Supabase");
    throw err;
  }
}

// 8. Fetch Real Dashboard Stats from Supabase
export async function fetchDashboardStatsFromDb(): Promise<DashboardStats | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const [meetingsCount, tasksCount, openTasksCount, completedTasksCount, overdueTasksCount] =
      await Promise.all([
        supabase.from("meetings").select("*", { count: "exact", head: true }),
        supabase.from("action_items").select("*", { count: "exact", head: true }),
        supabase
          .from("action_items")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "in_progress"]),
        supabase
          .from("action_items")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed"),
        supabase
          .from("action_items")
          .select("*", { count: "exact", head: true })
          .eq("status", "overdue"),
      ]);

    return {
      totalMeetings: meetingsCount.count || 0,
      totalTasks: tasksCount.count || 0,
      pendingTasks: openTasksCount.count || 0,
      completedTasks: completedTasksCount.count || 0,
      overdueTasks: overdueTasksCount.count || 0,
      upcomingMeetingsCount: 0,
    };
  } catch (err) {
    logger.error({ err }, "Database: Failed to fetch dashboard stats from Supabase");
    return null;
  }
}

import { supabase, isSupabaseConfigured } from "./client";
import { logger } from "@/lib/logger";
import {
  DbMeeting,
  DbDecision,
  DbActionItem,
  DbKnowledgeDocument,
  Meeting,
  Task,
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
        const { error: aError } = await supabase.from("action_items").insert(actionRows);
        if (aError) logger.warn({ aError }, "Error inserting action items into Supabase");
      }
    }

    logger.info({ meetingId }, "Successfully saved meeting with decisions & action items to Supabase");
    return { meetingId, success: true };
  } catch (err) {
    logger.error({ err }, "Database: Failed to save meeting to Supabase");
    throw err;
  }
}

// 3. Fetch Action Items (Tasks) from Supabase
export async function fetchActionItemsFromDb(): Promise<Task[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data: items, error } = await supabase
      .from("action_items")
      .select(`
        *,
        meetings:meeting_id (title)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!items) return [];

    type ActionItemWithMeeting = DbActionItem & { meetings: { title: string } | null };

    return (items as unknown as ActionItemWithMeeting[]).map((item) => ({
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
      meetingTitle: item.meetings?.title || undefined,
      outcome: item.outcome || undefined,
      carriedOver: false,
      createdAt: item.created_at,
      updatedAt: item.updated_at || item.created_at,
      history: [
        {
          id: `h-${item.id}`,
          timestamp: item.created_at,
          action: "Task created in Supabase",
          performedBy: item.owner_name || "System",
        },
      ],
    }));
  } catch (err) {
    logger.error({ err }, "Database: Failed to fetch action items from Supabase");
    throw err;
  }
}

// 4. Update Action Item Status in Supabase
export async function updateActionItemStatusInDb(
  id: string,
  status: TaskStatus
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from("action_items")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
    logger.info({ id, status }, "Updated action item status in Supabase");
  } catch (err) {
    logger.error({ err, id }, "Database: Failed to update action item status in Supabase");
    throw err;
  }
}

// 5. Create Standalone Action Item in Supabase
export async function createActionItemInDb(params: {
  title: string;
  description?: string;
  ownerName?: string;
  dueDate?: string;
  priority?: Priority;
  status?: TaskStatus;
  meetingId?: string;
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
      })
      .select("*, meetings:meeting_id (title)")
      .single();

    if (error) throw error;

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
      meetingTitle: data.meetings?.title || undefined,
      carriedOver: false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      history: [
        {
          id: `h-${data.id}`,
          timestamp: data.created_at,
          action: "Task created in Supabase",
          performedBy: data.owner_name || "System",
        },
      ],
    };
  } catch (err) {
    logger.error({ err }, "Database: Failed to create action item in Supabase");
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

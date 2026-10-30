"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Users,
  Search,
  Plus,
  Sparkles,
  Bot,
  Database,
  CalendarDays,
  FileText,
  Save,
  CheckCircle,
  HelpCircle,
  Trash2,
  Layers,
  RotateCw,
  Copy,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspace } from "@/lib/store/workspace-context";
import { formatDate } from "@/lib/utils";
import {
  Meeting,
  ClaudeProcessedActionItem,
  TaskStatus,
  Priority,
} from "@/types";

interface EditableActionItem {
  title: string;
  description: string;
  owner_name: string;
  due_date: string;
  priority: Priority;
  status: TaskStatus;
}

export default function MeetingsPage() {
  const {
    meetings,
    tasks,
    updateMeeting,
    saveMeetingWithAiRecap,
    carryForwardTasks,
    isDbConnected,
    generateCatchUpBrief,
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(
    meetings[0] || null
  );

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [carryForwardModalOpen, setCarryForwardModalOpen] = useState(false);

  // Catch-Up Brief states
  const [briefContent, setBriefContent] = useState("");
  const [briefTargetMeeting, setBriefTargetMeeting] = useState<Meeting | null>(null);
  const [isGeneratingAiBrief, setIsGeneratingAiBrief] = useState(false);
  const [aiBriefSource, setAiBriefSource] = useState<"template" | "claude">("template");

  // Edit notes state inside detail view
  const [currentNotes, setCurrentNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Carry Forward in Detail view state
  const [selectedCarryIdsDetail, setSelectedCarryIdsDetail] = useState<string[]>([]);
  const [isCarryingForward, setIsCarryingForward] = useState(false);

  // Workflow Form State (Meeting Creation & AI Recap)
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("2026-11-04");
  const [formParticipants, setFormParticipants] = useState("Alex Morgan, Sara Chen");
  const [formAgenda, setFormAgenda] = useState("");
  const [formRawNotes, setFormRawNotes] = useState("");
  const [formCarryTaskIds, setFormCarryTaskIds] = useState<string[]>([]);

  // AI Recap States
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasGeneratedRecap, setHasGeneratedRecap] = useState(false);

  // Editable AI Results
  const [recapSummary, setRecapSummary] = useState("");
  const [recapKeyPoints, setRecapKeyPoints] = useState<string[]>([]);
  const [recapDecisions, setRecapDecisions] = useState<string[]>([]);
  const [recapActionItems, setRecapActionItems] = useState<EditableActionItem[]>([]);
  const [recapUncertainties, setRecapUncertainties] = useState<string[]>([]);

  // Saving State
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.agenda.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Eligible tasks for carry-over (strictly open/pending/in_progress, never completed)
  const openTasksForCarryOver = tasks.filter((t) => t.status !== "completed");

  // 1. Generate AI Recap using real Claude API
  const handleGenerateAiRecap = async () => {
    if (!formTitle.trim()) {
      setAiError("Please enter a meeting title before generating AI recap.");
      return;
    }
    if (!formRawNotes.trim()) {
      setAiError("Please provide raw meeting notes for Claude to analyze.");
      return;
    }

    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const response = await fetch("/api/ai/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          agenda: formAgenda.trim(),
          participants: formParticipants.trim(),
          raw_notes: formRawNotes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to process meeting notes with Claude.");
      }

      const result = data.data;

      // Populate editable fields with real Claude output
      setRecapSummary(result.summary || "");
      setRecapKeyPoints(result.key_points || []);
      setRecapDecisions(result.decisions || []);
      setRecapActionItems(
        (result.action_items || []).map((item: ClaudeProcessedActionItem) => ({
          title: item.title,
          description: item.description || "",
          owner_name: item.owner_name || "",
          due_date: item.due_date || new Date().toISOString().split("T")[0],
          priority: item.priority || "medium",
          status: "pending" as TaskStatus,
        }))
      );
      setRecapUncertainties(result.uncertainties || []);
      setHasGeneratedRecap(true);
    } catch (err: unknown) {
      const e = err as Error;
      setAiError(
        e.message || "Claude API request failed. Raw notes remain safely preserved."
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // 2. Add manual decision row
  const handleAddDecision = () => {
    setRecapDecisions((prev) => [...prev, ""]);
  };

  const handleUpdateDecision = (index: number, val: string) => {
    setRecapDecisions((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleRemoveDecision = (index: number) => {
    setRecapDecisions((prev) => prev.filter((_, i) => i !== index));
  };

  // 3. Add manual action item
  const handleAddActionItem = () => {
    setRecapActionItems((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        owner_name: "Alex Morgan",
        due_date: new Date().toISOString().split("T")[0],
        priority: "medium",
        status: "pending",
      },
    ]);
  };

  const handleUpdateActionItem = (
    index: number,
    field: keyof EditableActionItem,
    val: string
  ) => {
    setRecapActionItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val } as EditableActionItem;
      return updated;
    });
  };

  const handleRemoveActionItem = (index: number) => {
    setRecapActionItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 4. Save to Database (Confirmation step)
  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setSaveError("Meeting title is required");
      return;
    }

    setIsSavingMeeting(true);
    setSaveError(null);

    try {
      const meetingId = await saveMeetingWithAiRecap({
        title: formTitle.trim(),
        meetingDate: `${formDate}T10:00:00Z`,
        agenda: formAgenda.trim(),
        participants: formParticipants.trim(),
        rawNotes: formRawNotes.trim(),
        summary: recapSummary.trim() || "",
        decisions: recapDecisions.filter((d) => d.trim().length > 0),
        actionItems: recapActionItems.filter((a) => a.title.trim().length > 0),
        carryForwardTaskIds: formCarryTaskIds,
      });

      // Reset form states
      setFormTitle("");
      setFormAgenda("");
      setFormRawNotes("");
      setRecapSummary("");
      setRecapDecisions([]);
      setRecapActionItems([]);
      setFormCarryTaskIds([]);
      setHasGeneratedRecap(false);
      setCreateDialogOpen(false);

      // Select newly created meeting
      const newlyCreated = meetings.find((m) => m.id === meetingId);
      if (newlyCreated) {
        setSelectedMeeting(newlyCreated);
        setCurrentNotes(newlyCreated.notes);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setSaveError(e.message || "Failed to save meeting to database.");
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const handleSelectMeeting = (m: Meeting) => {
    setSelectedMeeting(m);
    setCurrentNotes(m.notes || m.rawNotes || "");
  };

  const handleSaveNotes = () => {
    if (!selectedMeeting) return;
    setIsSavingNotes(true);
    updateMeeting(selectedMeeting.id, { notes: currentNotes, rawNotes: currentNotes });
    setSelectedMeeting((prev) => (prev ? { ...prev, notes: currentNotes, rawNotes: currentNotes } : null));
    setTimeout(() => setIsSavingNotes(false), 300);
  };

  // Open Catch-Up Brief modal
  const handleOpenBrief = (meeting: Meeting) => {
    setBriefTargetMeeting(meeting);
    setAiBriefSource("template");
    const initialBrief = generateCatchUpBrief(meeting.id);
    setBriefContent(initialBrief);
    setBriefDialogOpen(true);
  };

  // Generate real Claude AI Catch-up Brief via API
  const handleGenerateClaudeBrief = async () => {
    if (!briefTargetMeeting) return;

    setIsGeneratingAiBrief(true);
    try {
      const meetingTasks = tasks.filter((t) => t.meetingId === briefTargetMeeting.id);
      const carriedTasks = tasks.filter(
        (t) => t.carriedOver && t.meetingId === briefTargetMeeting.id
      );

      const response = await fetch("/api/ai/catch-up-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingTitle: briefTargetMeeting.title,
          meetingDate: briefTargetMeeting.date,
          participants: briefTargetMeeting.participants.map((p) => p.name),
          agenda: briefTargetMeeting.agenda,
          notes: briefTargetMeeting.notes || briefTargetMeeting.rawNotes,
          summary: briefTargetMeeting.summary || briefTargetMeeting.aiSummary,
          decisions: briefTargetMeeting.decisions || [],
          actionItems: meetingTasks.map((t) => ({
            title: t.title,
            owner: t.owner,
            dueDate: t.dueDate,
            priority: t.priority,
            status: t.status,
          })),
          carriedForwardTasks: carriedTasks.map((t) => ({
            title: t.title,
            owner: t.owner,
            origin: t.originalMeetingTitle || "Previous sync",
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI brief");
      }

      setBriefContent(data.brief);
      setAiBriefSource(data.aiGenerated ? "claude" : "template");
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Could not generate Claude brief: ${e.message}`);
    } finally {
      setIsGeneratingAiBrief(false);
    }
  };

  // Carry forward tasks into selected meeting
  const handleExecuteCarryForward = async () => {
    if (!selectedMeeting || selectedCarryIdsDetail.length === 0) return;

    setIsCarryingForward(true);
    try {
      await carryForwardTasks(selectedCarryIdsDetail, selectedMeeting.id);
      setSelectedCarryIdsDetail([]);
      setCarryForwardModalOpen(false);
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Failed to carry forward tasks: ${e.message}`);
    } finally {
      setIsCarryingForward(false);
    }
  };

  const meetingTasks = selectedMeeting
    ? tasks.filter((t) => t.meetingId === selectedMeeting.id)
    : [];

  const eligibleForCurrentMeeting = openTasksForCarryOver.filter(
    (t) => selectedMeeting && t.meetingId !== selectedMeeting.id
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Meeting Intelligence
            </h1>
            {isDbConnected ? (
              <Badge variant="success" className="text-[10px]">
                <Database className="h-3 w-3 mr-1" /> Supabase Connected
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px]">
                <Database className="h-3 w-3 mr-1" /> Local Demo Mode
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Capture raw notes, generate real Claude AI recaps, carry open tasks forward, and synthesize catch-up briefs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {selectedMeeting && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenBrief(selectedMeeting)}
              className="text-xs bg-white text-slate-700 hover:text-sky-600"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1 text-sky-600" />
              <span>Catch-Up Brief</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              setAiError(null);
              setSaveError(null);
              setFormTitle("");
              setFormAgenda("");
              setFormRawNotes("");
              setRecapSummary("");
              setRecapDecisions([]);
              setRecapActionItems([]);
              setFormCarryTaskIds([]);
              setHasGeneratedRecap(false);
              setCreateDialogOpen(true);
            }}
            className="text-xs bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>New Meeting</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search meetings by title, agenda, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 text-xs rounded border border-slate-200 bg-white px-2.5 text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="all">All Meetings ({meetings.length})</option>
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Meeting List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredMeetings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No meetings found"
              description="Record a team sync, paste rough discussion notes, and let Claude synthesize action items."
              actionLabel="New Meeting"
              onAction={() => setCreateDialogOpen(true)}
            />
          ) : (
            filteredMeetings.map((m) => {
              const isSelected = selectedMeeting?.id === m.id;
              const meetingItemTasks = tasks.filter((t) => t.meetingId === m.id);
              const carriedCount = meetingItemTasks.filter((t) => t.carriedOver).length;

              return (
                <div
                  key={m.id}
                  onClick={() => handleSelectMeeting(m)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/40 shadow-xs ring-1 ring-sky-500"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {m.title}
                    </h3>
                    <Badge
                      variant={
                        m.status === "completed"
                          ? "success"
                          : m.status === "in_progress"
                          ? "warning"
                          : "default"
                      }
                    >
                      {m.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {m.aiSummary || m.summary || m.agenda || "No summary recorded."}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{formatDate(m.date)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {carriedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          <RotateCw className="h-2.5 w-2.5" /> {carriedCount} carried
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span>{m.participants.length} attendees</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Meeting Detail & Actions (7 cols) */}
        <div className="lg:col-span-7">
          {selectedMeeting ? (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{selectedMeeting.title}</CardTitle>
                      <Badge variant="teal">{selectedMeeting.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(selectedMeeting.date)} • {selectedMeeting.location || "Virtual"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Carry forward open tasks button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 bg-white"
                      onClick={() => {
                        setSelectedCarryIdsDetail([]);
                        setCarryForwardModalOpen(true);
                      }}
                      title="Carry forward open tasks from other meetings into this sync"
                    >
                      <RotateCw className="h-3 w-3 text-amber-600 mr-1" />
                      Carry Forward Tasks
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 bg-white"
                      onClick={() => handleOpenBrief(selectedMeeting)}
                    >
                      <Sparkles className="h-3 w-3 text-sky-600 mr-1" />
                      Catch-Up Brief
                    </Button>
                  </div>
                </div>

                {/* Participants Pills */}
                <div className="flex items-center gap-1.5 flex-wrap mt-3">
                  <span className="text-[11px] font-medium text-slate-400 mr-1">Participants:</span>
                  {selectedMeeting.participants.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                      {p.name}
                    </span>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-6">
                {/* Agenda */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Meeting Agenda
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                    {selectedMeeting.agenda || "No agenda set."}
                  </div>
                </div>

                {/* Live Meeting Notes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Raw Discussion Notes
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveNotes}
                      isLoading={isSavingNotes}
                      className="text-xs h-7 text-sky-600 hover:text-sky-700"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Save Edits
                    </Button>
                  </div>
                  <Textarea
                    rows={4}
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    placeholder="Capture discussion points, questions, key updates..."
                    className="text-xs font-mono"
                  />
                </div>

                {/* AI Executive Summary & Decisions */}
                {(selectedMeeting.summary || selectedMeeting.aiSummary) && (
                  <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-sky-600" />
                      <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                        Executive Summary & Synthesis
                      </h4>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed">
                      {selectedMeeting.summary || selectedMeeting.aiSummary}
                    </p>

                    {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 && (
                      <div className="pt-2 border-t border-sky-100">
                        <h5 className="text-[11px] font-bold text-sky-800 mb-1.5 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-600" /> Decisions Extracted:
                        </h5>
                        <ul className="space-y-1">
                          {selectedMeeting.decisions.map((dec, i) => (
                            <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                              <span className="text-emerald-500 font-bold">•</span> {dec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Linked Tasks & Carried Forward Tasks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Action Items & Carried Deliverables ({meetingTasks.length})
                    </h4>
                    <button
                      onClick={() => {
                        setSelectedCarryIdsDetail([]);
                        setCarryForwardModalOpen(true);
                      }}
                      className="text-xs text-sky-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Carry More Tasks Here
                    </button>
                  </div>

                  {meetingTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No action items stored for this meeting.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {meetingTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white text-xs hover:border-slate-200 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                t.status === "completed"
                                  ? "bg-emerald-500"
                                  : t.status === "overdue"
                                  ? "bg-rose-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{t.title}</span>
                                {t.carriedOver && (
                                  <span className="inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                                    <RotateCw className="h-2 w-2" /> Carried Over
                                  </span>
                                )}
                              </div>
                              {t.carriedOver && t.originalMeetingTitle && (
                                <p className="text-[10px] text-slate-400">
                                  Originated from: {t.originalMeetingTitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-slate-500 shrink-0">
                            <span className="text-[11px]">{t.owner}</span>
                            <Badge variant={t.priority === "urgent" ? "danger" : "secondary"}>
                              {t.priority}
                            </Badge>
                            <Badge
                              variant={
                                t.status === "completed"
                                  ? "success"
                                  : t.status === "overdue"
                                  ? "danger"
                                  : "default"
                              }
                            >
                              {t.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-white/60 p-6 text-center">
              <CalendarDays className="h-10 w-10 text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-800 mb-1">Select a Meeting</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Choose a meeting from the left list to review raw notes, agenda, decisions, and action items.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* COMPLETE MEETING CREATION & AI RECAP DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} className="max-w-3xl">
        <form onSubmit={handleSaveMeeting}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              New Meeting & Claude AI Recap Workflow
            </DialogTitle>
            <DialogDescription>
              Enter notes, carry forward open sprint tasks, generate an AI recap, edit items, and save permanently to Supabase.
            </DialogDescription>
          </DialogHeader>

          {saveError && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {saveError}
            </div>
          )}

          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Step 1: Meeting Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Meeting Title *</label>
                <Input
                  placeholder="e.g. Q4 Sprint Planning & Technical Review"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Meeting Date *</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Attendees / Participants (comma separated)
              </label>
              <Input
                placeholder="Alex Morgan, Sara Chen, Marcus Vance"
                value={formParticipants}
                onChange={(e) => setFormParticipants(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Meeting Agenda</label>
              <Input
                placeholder="Main discussion topics, roadmap milestones..."
                value={formAgenda}
                onChange={(e) => setFormAgenda(e.target.value)}
              />
            </div>

            {/* Step 2: Meeting Continuity — Carry Forward Open Tasks */}
            {openTasksForCarryOver.length > 0 && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <RotateCw className="h-4 w-4 text-amber-700" />
                    <span className="font-semibold text-amber-900 text-xs">
                      Meeting Continuity: Carry Forward Open Tasks ({formCarryTaskIds.length} selected)
                    </span>
                  </div>
                  <span className="text-[10.5px] text-amber-700">
                    Open deliverables from previous syncs
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                  {openTasksForCarryOver.map((t) => {
                    const isChecked = formCarryTaskIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer text-xs transition-colors ${
                          isChecked
                            ? "bg-amber-100/70 border-amber-300 text-slate-900"
                            : "bg-white border-slate-200 text-slate-700 hover:border-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormCarryTaskIds((prev) => [...prev, t.id]);
                              } else {
                                setFormCarryTaskIds((prev) => prev.filter((id) => id !== t.id));
                              }
                            }}
                            className="rounded text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                          />
                          <div>
                            <span className="font-medium">{t.title}</span>
                            {t.meetingTitle && (
                              <span className="text-[10px] text-slate-400 ml-1.5">
                                (From: {t.meetingTitle})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">{t.owner}</span>
                          <Badge variant={t.priority === "urgent" ? "danger" : "secondary"}>
                            {t.priority}
                          </Badge>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Raw Meeting Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-700">
                  Raw Meeting Notes & Discussion *
                </label>
                <span className="text-[11px] text-slate-400">
                  Paste bullet points, discussion notes, or rough transcripts
                </span>
              </div>
              <Textarea
                rows={5}
                placeholder="Team reviewed Q4 roadmap. Agreed to deploy Claude 3.5 Sonnet prompt processing by Friday. Alex will coordinate testing with QA. Sara raised concerns on API timeouts, agreed to implement timeout fallback..."
                value={formRawNotes}
                onChange={(e) => setFormRawNotes(e.target.value)}
                required
                className="font-mono text-xs"
              />
            </div>

            {/* AI Error Alert if any */}
            {aiError && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <Bot className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Claude AI Processing Notice</p>
                  <p className="text-[11px] mt-0.5 text-amber-700">{aiError}</p>
                </div>
              </div>
            )}

            {/* Action to Trigger Claude AI Recap */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="font-semibold text-slate-800 text-xs">
                  Generate Structured AI Recap
                </p>
                <p className="text-[11px] text-slate-500">
                  Claude extracts key discussion points, concrete decisions, and action items with owners and due dates.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerateAiRecap}
                isLoading={isGeneratingAi}
                className="bg-white border-sky-300 text-sky-700 hover:bg-sky-50 text-xs shrink-0"
              >
                <Bot className="h-3.5 w-3.5 mr-1 text-sky-600" />
                <span>{hasGeneratedRecap ? "Regenerate AI Recap" : "Generate AI Recap"}</span>
              </Button>
            </div>

            {/* Step 4: Editable Structured Recap (Appears after AI generation or manual creation) */}
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                  Review & Edit Extracted Results Before Saving
                </h4>
                {hasGeneratedRecap && (
                  <Badge variant="teal" className="text-[10px]">
                    Claude AI Synthesized
                  </Badge>
                )}
              </div>

              {/* Editable Summary */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Executive Summary
                </label>
                <Textarea
                  value={recapSummary}
                  onChange={(e) => setRecapSummary(e.target.value)}
                  placeholder="Concise summary synthesized from notes..."
                  rows={2}
                />
              </div>

              {recapKeyPoints.length > 0 && (
                <div className="p-2.5 bg-sky-50/50 rounded-lg border border-sky-100">
                  <h5 className="font-semibold text-sky-900 text-[11px] mb-1">
                    Key Discussion Points:
                  </h5>
                  <ul className="list-disc list-inside text-[11px] text-sky-800 space-y-0.5">
                    {recapKeyPoints.map((kp, i) => (
                      <li key={i}>{kp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Editable Decisions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    Decisions Extracted ({recapDecisions.length})
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddDecision}
                    className="text-xs h-6 text-sky-600"
                  >
                    + Add Decision
                  </Button>
                </div>

                {recapDecisions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    No decisions extracted yet. Click &apos;Generate AI Recap&apos; or add one manually.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recapDecisions.map((dec, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={dec}
                          onChange={(e) => handleUpdateDecision(idx, e.target.value)}
                          placeholder="e.g. Approved Q4 deployment date"
                          className="text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDecision(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Editable Action Items */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-sky-600" />
                    Action Items ({recapActionItems.length})
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddActionItem}
                    className="text-xs h-6 text-sky-600"
                  >
                    + Add Action Item
                  </Button>
                </div>

                {recapActionItems.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    No action items yet. Claude will extract task titles, owners, and due dates.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {recapActionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Action item task title *"
                            value={item.title}
                            onChange={(e) =>
                              handleUpdateActionItem(idx, "title", e.target.value)
                            }
                            className="text-xs flex-1"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveActionItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Input
                            placeholder="Assigned Owner (null if none)"
                            value={item.owner_name}
                            onChange={(e) =>
                              handleUpdateActionItem(idx, "owner_name", e.target.value)
                            }
                            className="text-xs"
                          />
                          <Input
                            type="date"
                            value={item.due_date}
                            onChange={(e) =>
                              handleUpdateActionItem(idx, "due_date", e.target.value)
                            }
                            className="text-xs"
                          />
                          <select
                            value={item.priority}
                            onChange={(e) =>
                              handleUpdateActionItem(
                                idx,
                                "priority",
                                e.target.value as Priority
                              )
                            }
                            className="h-8 text-xs rounded border border-slate-200 bg-white px-2 text-slate-700"
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Uncertainties display if any */}
              {recapUncertainties.length > 0 && (
                <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-100">
                  <h5 className="font-semibold text-amber-900 flex items-center gap-1 text-[11px] mb-1">
                    <HelpCircle className="h-3 w-3 text-amber-600" />
                    Open Questions / Uncertainties Flagged by Claude:
                  </h5>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                    {recapUncertainties.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSavingMeeting}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save Meeting to Database
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* CARRY FORWARD TASKS MODAL (DETAIL VIEW) */}
      <Dialog
        open={carryForwardModalOpen}
        onOpenChange={setCarryForwardModalOpen}
        className="max-w-lg"
      >
        <div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              <RotateCw className="h-5 w-5 text-amber-600" />
              Carry Forward Open Tasks into This Meeting
            </DialogTitle>
            <DialogDescription>
              Select open or in-progress deliverables from previous syncs to carry over into{" "}
              <strong>{selectedMeeting?.title}</strong>. Tasks maintain their complete audit history and original meeting references.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 space-y-2 max-h-72 overflow-y-auto pr-1">
            {eligibleForCurrentMeeting.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-200 rounded-lg">
                No open tasks available from other meetings to carry forward.
              </p>
            ) : (
              eligibleForCurrentMeeting.map((t) => {
                const isChecked = selectedCarryIdsDetail.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                      isChecked
                        ? "bg-amber-50 border-amber-300 text-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:border-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCarryIdsDetail((prev) => [...prev, t.id]);
                          } else {
                            setSelectedCarryIdsDetail((prev) => prev.filter((id) => id !== t.id));
                          }
                        }}
                        className="rounded text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                      />
                      <div>
                        <span className="font-semibold">{t.title}</span>
                        {t.meetingTitle && (
                          <p className="text-[10px] text-slate-400">
                            Current Meeting: {t.meetingTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-slate-500">{t.owner}</span>
                      <Badge variant={t.priority === "urgent" ? "danger" : "secondary"}>
                        {t.priority}
                      </Badge>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCarryForwardModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={isCarryingForward}
              disabled={selectedCarryIdsDetail.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleExecuteCarryForward}
            >
              Carry Forward {selectedCarryIdsDetail.length > 0 && `(${selectedCarryIdsDetail.length})`}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* CATCH-UP BRIEF MODAL */}
      <Dialog open={briefDialogOpen} onOpenChange={setBriefDialogOpen} className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sky-600" />
              AI Catch-Up Executive Brief
            </DialogTitle>
            {aiBriefSource === "claude" ? (
              <Badge variant="teal" className="text-[10px]">
                Claude 3.5 Sonnet Synthesized
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Structured Overview
              </Badge>
            )}
          </div>
          <DialogDescription>
            High-velocity catch-up brief for anyone who missed {briefTargetMeeting?.title || "this meeting"}.
          </DialogDescription>
        </DialogHeader>

        {/* Live Claude AI trigger button */}
        <div className="flex items-center justify-between p-2.5 bg-sky-50/60 rounded-lg border border-sky-100 my-2">
          <div className="text-xs">
            <p className="font-semibold text-sky-950">Synthesize Deep Executive Brief</p>
            <p className="text-[11px] text-sky-700">
              Generate an intelligent Claude AI brief with decisions, blockers, and next 48-hour steps.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateClaudeBrief}
            isLoading={isGeneratingAiBrief}
            className="text-xs h-7 bg-white border-sky-300 text-sky-700 hover:bg-sky-50 shrink-0"
          >
            <Bot className="h-3 w-3 mr-1 text-sky-600" />
            Synthesize with Claude
          </Button>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-800 leading-relaxed max-h-96 overflow-y-auto">
          {briefContent}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(briefContent);
              alert("Catch-up brief copied to clipboard!");
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy Brief
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setBriefDialogOpen(false)}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  Search,
  Plus,
  Users,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Database,
  Trash2,
  Calendar,
  Layers,
  HelpCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspace } from "@/lib/store/workspace-context";
import { formatDate } from "@/lib/utils";
import { Meeting, Priority, TaskStatus, ClaudeProcessedActionItem } from "@/types";

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
    saveMeetingWithAiRecap,
    updateMeeting,
    tasks,
    generateCatchUpBrief,
    settings,
    isDbConnected,
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(
    meetings[0] || null
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [briefContent, setBriefContent] = useState("");

  // Edit notes state inside detail view
  const [currentNotes, setCurrentNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Workflow Form State (Meeting Creation & AI Recap)
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("2026-11-04");
  const [formParticipants, setFormParticipants] = useState("Alex Morgan, Sara Chen");
  const [formAgenda, setFormAgenda] = useState("");
  const [formRawNotes, setFormRawNotes] = useState("");

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
        owner_name: settings.userName,
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
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
      });

      // Reset form states
      setFormTitle("");
      setFormAgenda("");
      setFormRawNotes("");
      setRecapSummary("");
      setRecapDecisions([]);
      setRecapActionItems([]);
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

  const handleOpenBrief = (meetingId: string) => {
    const brief = generateCatchUpBrief(meetingId);
    setBriefContent(brief);
    setBriefDialogOpen(true);
  };

  const meetingTasks = selectedMeeting
    ? tasks.filter((t) => t.meetingId === selectedMeeting.id)
    : [];

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
            Capture raw notes, generate real Claude AI recaps, edit extracted items, and save permanently to Supabase.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setAiError(null);
            setSaveError(null);
            setCreateDialogOpen(true);
          }}
          className="text-xs bg-sky-600 hover:bg-sky-700 text-white self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Meeting</span>
        </Button>
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
          <span className="text-xs text-slate-500 whitespace-nowrap">Status:</span>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36 text-xs"
          >
            <option value="all">All Meetings</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
          </Select>
        </div>
      </div>

      {/* Main Split View: Left List, Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Meeting List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredMeetings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No meetings found"
              description="No meetings match your criteria. Create a meeting with raw notes to run Claude AI recap."
              actionLabel="Create Meeting"
              onAction={() => setCreateDialogOpen(true)}
            />
          ) : (
            filteredMeetings.map((m) => {
              const isSelected = selectedMeeting?.id === m.id;
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
                      <span>{formatDate(m.date)} • {m.time}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-slate-400" />
                      <span>{m.participants.length} attendees</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Meeting Detail & AI Insights (7 cols) */}
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

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 bg-white"
                      onClick={() => handleOpenBrief(selectedMeeting.id)}
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
                      Raw Meeting Notes
                    </h4>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs h-7 px-2.5"
                      isLoading={isSavingNotes}
                      onClick={handleSaveNotes}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save Notes
                    </Button>
                  </div>
                  <Textarea
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    placeholder="Meeting notes..."
                    rows={4}
                    className="text-xs font-sans leading-relaxed"
                  />
                </div>

                {/* Claude AI Summary Section */}
                {(selectedMeeting.aiSummary || selectedMeeting.summary) && (
                  <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-sky-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                        Claude AI Structured Summary
                      </h4>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {selectedMeeting.aiSummary || selectedMeeting.summary}
                    </p>

                    {/* Decisions */}
                    {selectedMeeting.decisions && selectedMeeting.decisions.length > 0 && (
                      <div className="pt-2 border-t border-sky-100/80">
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

                {/* Linked Tasks */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Extracted Action Items ({meetingTasks.length})
                  </h4>
                  {meetingTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No action items stored for this meeting.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {meetingTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                t.status === "completed"
                                  ? "bg-emerald-500"
                                  : t.status === "overdue"
                                  ? "bg-rose-500"
                                  : "bg-amber-500"
                              }`}
                            />
                            <span className="font-medium text-slate-800">{t.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <span>{t.owner}</span>
                            <Badge variant={t.priority === "urgent" ? "danger" : "secondary"}>
                              {t.priority}
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

      {/* Complete Meeting Creation & AI Recap Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} className="max-w-2xl">
        <form onSubmit={handleSaveMeeting}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              New Meeting & Claude AI Recap Workflow
            </DialogTitle>
            <DialogDescription>
              Enter notes, generate an AI structured recap, edit decisions and action items, and save directly to Supabase.
            </DialogDescription>
          </DialogHeader>

          {saveError && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {saveError}
            </div>
          )}

          <div className="space-y-4 text-xs">
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
                <label className="block font-medium text-slate-700 mb-1">Meeting Date</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Participants (comma separated)
                </label>
                <Input
                  placeholder="Alex Morgan, Sara Chen, Marcus Vance"
                  value={formParticipants}
                  onChange={(e) => setFormParticipants(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Agenda</label>
                <Input
                  placeholder="e.g. Discuss API milestones, DB schemas"
                  value={formAgenda}
                  onChange={(e) => setFormAgenda(e.target.value)}
                />
              </div>
            </div>

            {/* Step 2: Raw Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-800">
                  Raw Meeting Notes *
                </label>
                <span className="text-[11px] text-slate-400">
                  Notes are always preserved if AI fails
                </span>
              </div>
              <Textarea
                placeholder="Type or paste discussion notes, verbatim remarks, tasks agreed on, or questions..."
                value={formRawNotes}
                onChange={(e) => setFormRawNotes(e.target.value)}
                rows={4}
                required
              />
            </div>

            {/* Generate AI Recap Action Bar */}
            <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sky-950 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-sky-600" />
                  Claude 3.5 Sonnet Synthesis
                </p>
                <p className="text-[11px] text-slate-600">
                  Extracts summary, decisions, and action items without automatic saving.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="primary"
                isLoading={isGeneratingAi}
                onClick={handleGenerateAiRecap}
                className="bg-sky-600 hover:bg-sky-700 text-white shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generate AI Recap
              </Button>
            </div>

            {aiError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Notice from AI Engine</p>
                  <p className="text-[11px] mt-0.5">{aiError}</p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    You can still edit and save your meeting manually below!
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Editable AI Output (Summary, Decisions, Action Items) */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Executive Summary {hasGeneratedRecap && "(Generated by Claude – Editable)"}
                </label>
                <Textarea
                  placeholder="AI generated summary will appear here for you to review and edit..."
                  value={recapSummary}
                  onChange={(e) => setRecapSummary(e.target.value)}
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
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
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
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Input
                              placeholder="Owner (or leave unassigned)"
                              value={item.owner_name}
                              onChange={(e) =>
                                handleUpdateActionItem(idx, "owner_name", e.target.value)
                              }
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Input
                              type="date"
                              value={item.due_date}
                              onChange={(e) =>
                                handleUpdateActionItem(idx, "due_date", e.target.value)
                              }
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Select
                              value={item.priority}
                              onChange={(e) =>
                                handleUpdateActionItem(idx, "priority", e.target.value)
                              }
                              className="text-xs h-9"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </Select>
                          </div>
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

      {/* Catch-Up Brief Modal */}
      <Dialog open={briefDialogOpen} onOpenChange={setBriefDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-600" />
            AI Catch-Up Executive Brief
          </DialogTitle>
          <DialogDescription>
            Claude AI synthesis prepared for team catch-up and async handoffs.
          </DialogDescription>
        </DialogHeader>

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
            Copy Brief
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setBriefDialogOpen(false)}
            className="bg-sky-600 hover:bg-sky-700"
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

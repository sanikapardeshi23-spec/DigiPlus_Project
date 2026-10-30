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
import { Meeting } from "@/types";

export default function MeetingsPage() {
  const {
    meetings,
    addMeeting,
    updateMeeting,
    tasks,
    generateCatchUpBrief,
    settings,
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [briefContent, setBriefContent] = useState("");

  // Edit notes state inside detail view
  const [currentNotes, setCurrentNotes] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Form states for creating a meeting
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("2026-11-04");
  const [formTime, setFormTime] = useState("10:00 AM");
  const [formDuration, setFormDuration] = useState("45");
  const [formLocation, setFormLocation] = useState("Google Meet / Room A");
  const [formParticipants, setFormParticipants] = useState("Alex Morgan, Sara Chen");
  const [formAgenda, setFormAgenda] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.agenda.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Meeting title is required");
      return;
    }
    if (!formAgenda.trim()) {
      setFormError("Meeting agenda is required");
      return;
    }

    const participantList = formParticipants
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@digiplus.internal`,
      }));

    const newMeeting = addMeeting({
      title: formTitle.trim(),
      date: formDate,
      time: formTime,
      durationMinutes: parseInt(formDuration, 10) || 45,
      location: formLocation,
      status: "scheduled",
      participants: participantList.length > 0 ? participantList : [{ name: settings.userName }],
      agenda: formAgenda.trim(),
      notes: formNotes.trim(),
    });

    setFormTitle("");
    setFormAgenda("");
    setFormNotes("");
    setFormError("");
    setCreateDialogOpen(false);
    setSelectedMeeting(newMeeting);
    setCurrentNotes(newMeeting.notes);
  };

  const handleSelectMeeting = (m: Meeting) => {
    setSelectedMeeting(m);
    setCurrentNotes(m.notes);
  };

  const handleSaveNotes = () => {
    if (!selectedMeeting) return;
    updateMeeting(selectedMeeting.id, { notes: currentNotes });
    setSelectedMeeting((prev) => (prev ? { ...prev, notes: currentNotes } : null));
  };

  const handleSimulateClaudeExtraction = () => {
    if (!selectedMeeting) return;
    setIsSummarizing(true);

    setTimeout(() => {
      const summary = `Claude AI Executive Summary for ${selectedMeeting.title}: The session reviewed deliverables, finalized upcoming implementation priorities, and aligned cross-functional timelines.`;
      const decisions = [
        "Approved architecture approach using Next.js App Router and PostgreSQL.",
        "Set Friday deployment deadline for the MVP release.",
      ];
      const actionItems = [
        `Complete integration verification (${selectedMeeting.participants[0]?.name || "Alex Morgan"})`,
        `Draft release notes and verify catch-up brief export`,
      ];

      updateMeeting(selectedMeeting.id, {
        notes: currentNotes,
        aiSummary: summary,
        decisions,
        actionItems,
        status: "completed",
      });

      setSelectedMeeting((prev) =>
        prev
          ? {
              ...prev,
              notes: currentNotes,
              aiSummary: summary,
              decisions,
              actionItems,
              status: "completed",
            }
          : null
      );
      setIsSummarizing(false);
    }, 800);
  };

  const handleOpenBrief = (meetingId: string) => {
    const brief = generateCatchUpBrief(meetingId);
    setBriefContent(brief);
    setBriefDialogOpen(true);
  };

  // Associated tasks for selected meeting
  const meetingTasks = selectedMeeting
    ? tasks.filter((t) => t.meetingId === selectedMeeting.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Meeting Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Capture notes, run Claude AI synthesis, extract action tasks, and preserve decisions.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
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
              description="No meetings match your current search criteria. Create one to begin capturing notes."
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
                    {m.agenda || "No agenda set."}
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
                      {formatDate(selectedMeeting.date)} at {selectedMeeting.time} ({selectedMeeting.durationMinutes} mins) • {selectedMeeting.location}
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
                      Brief
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs h-8 bg-sky-600 hover:bg-sky-700"
                      isLoading={isSummarizing}
                      onClick={handleSimulateClaudeExtraction}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Claude Analyze
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
                      {p.name} {p.role ? `(${p.role})` : ""}
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
                    {selectedMeeting.agenda}
                  </div>
                </div>

                {/* Live Notes Input / Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Live Meeting Notes
                    </h4>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs h-7 px-2.5"
                      onClick={handleSaveNotes}
                    >
                      Save Notes
                    </Button>
                  </div>
                  <Textarea
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    placeholder="Type or paste ongoing meeting notes, discussion points, and remarks here..."
                    rows={4}
                    className="text-xs font-sans leading-relaxed"
                  />
                </div>

                {/* Claude AI Summary Section */}
                {selectedMeeting.aiSummary && (
                  <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-sky-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                        Claude AI Structured Summary
                      </h4>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {selectedMeeting.aiSummary}
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

                    {/* Action Items */}
                    {selectedMeeting.actionItems && selectedMeeting.actionItems.length > 0 && (
                      <div className="pt-2 border-t border-sky-100/80">
                        <h5 className="text-[11px] font-bold text-sky-800 mb-1.5 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-sky-600" /> Assigned Action Items:
                        </h5>
                        <ul className="space-y-1">
                          {selectedMeeting.actionItems.map((act, i) => (
                            <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                              <span className="text-sky-500 font-bold">✓</span> {act}
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
                    Linked Action Tasks ({meetingTasks.length})
                  </h4>
                  {meetingTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No standalone tasks linked to this meeting yet.
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
                Choose a meeting from the left list to review notes, agenda, participants, and Claude AI extraction.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Meeting Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <form onSubmit={handleCreateSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Meeting</DialogTitle>
            <DialogDescription>
              Define meeting schedule, attendees, and key agenda items.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="mb-3 p-2 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {formError}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Title *</label>
              <Input
                placeholder="e.g. Q4 Growth & Technical Sync"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Date *</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Time</label>
                <Input
                  type="text"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Duration</label>
                <Select
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Location / Link</label>
              <Input
                placeholder="e.g. Google Meet, Zoom, Boardroom B"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Attendees (comma separated)</label>
              <Input
                placeholder="Alex Morgan, Sara Chen, Marcus Vance"
                value={formParticipants}
                onChange={(e) => setFormParticipants(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Agenda *</label>
              <Textarea
                placeholder="List topics and goals..."
                value={formAgenda}
                onChange={(e) => setFormAgenda(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Initial Notes (optional)</label>
              <Textarea
                placeholder="Initial context or pre-reading..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-sky-600 hover:bg-sky-700">
              Save Meeting
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

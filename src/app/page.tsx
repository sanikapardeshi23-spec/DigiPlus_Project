"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Users,
  Calendar,
  Layers,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "@/lib/store/workspace-context";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { stats, meetings, tasks, addMeeting, generateCatchUpBrief, settings } = useWorkspace();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [briefContent, setBriefContent] = useState("");

  // Meeting Form
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("2026-11-03");
  const [time, setTime] = useState("10:00 AM");
  const [duration, setDuration] = useState("45");
  const [agenda, setAgenda] = useState("");
  const [participants, setParticipants] = useState("Alex Morgan, Sara Chen");

  const recentMeetings = meetings.slice(0, 4);
  const upcomingTasks = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !agenda.trim()) return;

    const parts = participants
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((name) => ({ name, email: `${name.toLowerCase().replace(/\s+/g, ".")}@digiplus.internal` }));

    addMeeting({
      title: title.trim(),
      date,
      time,
      durationMinutes: parseInt(duration, 10) || 45,
      location: "Room A / Virtual",
      status: "scheduled",
      participants: parts.length > 0 ? parts : [{ name: settings.userName }],
      agenda: agenda.trim(),
      notes: "",
    });

    setTitle("");
    setAgenda("");
    setCreateDialogOpen(false);
  };

  const handleOpenBrief = (meetingId: string) => {
    const content = generateCatchUpBrief(meetingId);
    setBriefContent(content);
    setBriefDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Workspace Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time meeting intelligence, task status, and cross-team alignment for{" "}
            <span className="font-semibold text-slate-700">{settings.workspaceName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (recentMeetings.length > 0) {
                handleOpenBrief(recentMeetings[0].id);
              }
            }}
            className="text-xs text-slate-700 bg-white"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-600" />
            <span>Generate Catch-Up Brief</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="text-xs bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Meeting</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Meetings"
          value={stats.totalMeetings}
          icon={<CalendarDays className="h-4 w-4" />}
          change={`${stats.upcomingMeetingsCount} upcoming`}
          changeType="neutral"
          description="Logged workspace syncs"
        />

        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={<Layers className="h-4 w-4" />}
          description="Extracted and tracked"
        />

        <StatCard
          title="Pending Tasks"
          value={stats.pendingTasks}
          icon={<Clock className="h-4 w-4" />}
          change={stats.pendingTasks > 0 ? "Active" : "All Done"}
          changeType={stats.pendingTasks > 0 ? "neutral" : "positive"}
          description="In backlog & progress"
        />

        <StatCard
          title="Completed"
          value={stats.completedTasks}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          change={
            stats.totalTasks > 0
              ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}% done`
              : "0%"
          }
          changeType="positive"
          description="Resolved deliverables"
        />

        <StatCard
          title="Overdue Tasks"
          value={stats.overdueTasks}
          icon={<AlertCircle className="h-4 w-4 text-rose-600" />}
          change={stats.overdueTasks > 0 ? "Requires Action" : "Clean"}
          changeType={stats.overdueTasks > 0 ? "negative" : "positive"}
          description="Past due deadline"
        />
      </div>

      {/* Main Grid: Recent Meetings & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Meetings (7 cols) */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Meetings & Notes</CardTitle>
              <CardDescription>
                Synchronized notes with Claude AI structured summaries
              </CardDescription>
            </div>
            <Link
              href="/meetings"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {recentMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-slate-900 hover:text-sky-600">
                        {meeting.title}
                      </h4>
                      <Badge
                        variant={
                          meeting.status === "completed"
                            ? "success"
                            : meeting.status === "in_progress"
                            ? "warning"
                            : "default"
                        }
                      >
                        {meeting.status}
                      </Badge>
                      {meeting.decisions && meeting.decisions.length > 0 && (
                        <span className="text-[10.5px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {meeting.decisions.length} Decisions
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDate(meeting.date)} • {meeting.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        {meeting.participants.length} attendees
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2.5 bg-white text-slate-700 hover:text-sky-600"
                      onClick={() => handleOpenBrief(meeting.id)}
                    >
                      <Sparkles className="h-3 w-3 text-sky-500 mr-1" />
                      Brief
                    </Button>
                    <Link href="/meetings">
                      <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines (5 cols) */}
        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Upcoming Task Deadlines</CardTitle>
              <CardDescription>
                Prioritized action items needing fulfillment
              </CardDescription>
            </div>
            <Link
              href="/tasks"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              Task board <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {upcomingTasks.map((task) => {
                const isOverdue = task.status === "overdue";
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 hover:shadow-2xs transition-all flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{task.owner}</span>
                        <span>•</span>
                        <span className={isOverdue ? "text-rose-600 font-semibold" : ""}>
                          Due {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={
                          task.priority === "urgent"
                            ? "danger"
                            : task.priority === "high"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {task.priority}
                      </Badge>
                      {task.carriedOver && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold"
                          title="Carried over from prior meeting"
                        >
                          Carried
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Meeting Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <form onSubmit={handleCreateMeeting}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              Create Team Meeting
            </DialogTitle>
            <DialogDescription>
              Record participants, schedule, and agenda for immediate AI synthesis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Title *</label>
              <Input
                placeholder="e.g. DigiPlus Architecture & Release Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Date *</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Time</label>
                <Input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Duration (Min)</label>
                <Select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="30">30 mins</option>
                  <option value="45">45 mins</option>
                  <option value="60">60 mins</option>
                  <option value="90">90 mins</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Attendees (comma separated)
              </label>
              <Input
                placeholder="Alex Morgan, Sara Chen, Marcus Vance"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Agenda *</label>
              <Textarea
                placeholder="List key items to discuss..."
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={3}
                required
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

      {/* AI Catch-Up Brief Modal */}
      <Dialog open={briefDialogOpen} onOpenChange={setBriefDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-600" />
            AI Catch-Up Executive Brief
          </DialogTitle>
          <DialogDescription>
            Condensed synthesis generated by Claude AI for quick team synchronization.
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

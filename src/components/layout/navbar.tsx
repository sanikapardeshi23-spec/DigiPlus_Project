"use client";

import React, { useState } from "react";
import {
  Menu,
  Bell,
  Search,
  Plus,
  Calendar,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "@/lib/store/workspace-context";

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { addMeeting, addTask, settings } = useWorkspace();
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // Quick Meeting form state
  const [mTitle, setMTitle] = useState("");
  const [mDate, setMDate] = useState("2026-11-03");
  const [mTime, setMTime] = useState("10:00 AM");
  const [mDuration, setMDuration] = useState("45");
  const [mAgenda, setMAgenda] = useState("");
  const [mParticipants, setMParticipants] = useState("Alex Morgan, Sara Chen");
  const [mFormError, setMFormError] = useState("");

  // Quick Task form state
  const [tTitle, setTTitle] = useState("");
  const [tOwner, setTOwner] = useState(settings.userName);
  const [tDueDate, setTDueDate] = useState("2026-11-05");
  const [tPriority, setTPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [tDesc, setTDesc] = useState("");
  const [tFormError, setTFormError] = useState("");

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim()) {
      setMFormError("Meeting title is required");
      return;
    }
    if (!mAgenda.trim()) {
      setMFormError("Please provide an agenda");
      return;
    }

    const participantsList = mParticipants
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@digiplus.internal`,
      }));

    await addMeeting({
      title: mTitle.trim(),
      date: mDate,
      time: mTime,
      durationMinutes: parseInt(mDuration, 10) || 45,
      location: "Google Meet / Room A",
      status: "scheduled",
      participants: participantsList.length > 0 ? participantsList : [{ name: settings.userName }],
      agenda: mAgenda.trim(),
      notes: "",
    });

    setMTitle("");
    setMAgenda("");
    setMFormError("");
    setMeetingDialogOpen(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle.trim()) {
      setTFormError("Task title is required");
      return;
    }

    await addTask({
      title: tTitle.trim(),
      description: tDesc.trim() || undefined,
      owner: tOwner.trim() || settings.userName,
      dueDate: tDueDate,
      priority: tPriority,
      status: "pending",
      carriedOver: false,
    });

    setTTitle("");
    setTDesc("");
    setTFormError("");
    setTaskDialogOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Quick Search */}
          <div className="hidden sm:flex items-center relative w-64 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search meetings, tasks & notes..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Action Buttons */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTaskDialogOpen(true)}
            className="hidden sm:inline-flex text-xs h-8"
          >
            <CheckSquare className="h-3.5 w-3.5 text-slate-500" />
            <span>Add Task</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setMeetingDialogOpen(true)}
            className="text-xs h-8 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Meeting</span>
          </Button>

          {/* AI Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            OpenAI Ready
          </div>

          {/* Notification Icon */}
          <button
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-sky-500" />
          </button>
        </div>
      </header>

      {/* Quick Create Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <form onSubmit={handleCreateMeeting}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              Schedule New Meeting
            </DialogTitle>
            <DialogDescription>
              Record participants and agenda. AI will automatically extract action items.
            </DialogDescription>
          </DialogHeader>

          {mFormError && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {mFormError}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Meeting Title *</label>
              <Input
                placeholder="e.g. Sprint 13 Planning & Technical Architecture"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Date *</label>
                <Input
                  type="date"
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Time</label>
                <Input
                  type="text"
                  placeholder="10:00 AM"
                  value={mTime}
                  onChange={(e) => setMTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Duration (Min)</label>
                <Select
                  value={mDuration}
                  onChange={(e) => setMDuration(e.target.value)}
                >
                  <option value="15">15 mins</option>
                  <option value="30">30 mins</option>
                  <option value="45">45 mins</option>
                  <option value="60">60 mins</option>
                  <option value="90">90 mins</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Participants (comma separated)
              </label>
              <Input
                placeholder="Alex Morgan, Sara Chen, David Kim"
                value={mParticipants}
                onChange={(e) => setMParticipants(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Agenda *</label>
              <Textarea
                placeholder="List main discussion topics and goals..."
                value={mAgenda}
                onChange={(e) => setMAgenda(e.target.value)}
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
              onClick={() => setMeetingDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-sky-600 hover:bg-sky-700">
              Create Meeting
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Quick Add Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <form onSubmit={handleCreateTask}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-sky-600" />
              Create Action Task
            </DialogTitle>
            <DialogDescription>
              Assign ownership, set priority, and track execution history.
            </DialogDescription>
          </DialogHeader>

          {tFormError && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {tFormError}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Task Title *</label>
              <Input
                placeholder="e.g. Implement Supabase PostgreSQL RLS policy"
                value={tTitle}
                onChange={(e) => setTTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Owner *</label>
                <Input
                  value={tOwner}
                  onChange={(e) => setTOwner(e.target.value)}
                  placeholder="Assignee name"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Due Date *</label>
                <Input
                  type="date"
                  value={tDueDate}
                  onChange={(e) => setTDueDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Priority</label>
                <Select
                  value={tPriority}
                  onChange={(e) =>
                    setTPriority(e.target.value as "low" | "medium" | "high" | "urgent")
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Description</label>
              <Textarea
                placeholder="Details, technical acceptance criteria, or context..."
                value={tDesc}
                onChange={(e) => setTDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTaskDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-sky-600 hover:bg-sky-700">
              Save Task
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

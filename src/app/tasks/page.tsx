"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Search,
  Plus,
  History,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspace } from "@/lib/store/workspace-context";
import { formatDate } from "@/lib/utils";
import { Task, Priority, TaskStatus } from "@/types";

export default function TasksPage() {
  const { tasks, addTask, updateTask, meetings, settings } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState(settings.userName);
  const [dueDate, setDueDate] = useState("2026-11-06");
  const [priority, setPriority] = useState<Priority>("medium");
  const [meetingId, setMeetingId] = useState<string>("");
  const [formError, setFormError] = useState("");

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Task title is required");
      return;
    }

    const linkedMeeting = meetings.find((m) => m.id === meetingId);

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      owner: owner.trim() || settings.userName,
      dueDate,
      priority,
      status: "pending",
      meetingId: meetingId || undefined,
      meetingTitle: linkedMeeting?.title,
      carriedOver: false,
    });

    setTitle("");
    setDescription("");
    setFormError("");
    setCreateDialogOpen(false);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTask(taskId, { status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Task Management & Execution
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign accountability, preserve full task audit history, and carry forward pending items.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          className="text-xs bg-sky-600 hover:bg-sky-700 text-white self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Create Task</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title, owner, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Status:</span>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-32 text-xs"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Priority:</span>
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-28 text-xs"
            >
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks match the filter"
          description="Try relaxing your filters or create a new action task to begin tracking execution."
          actionLabel="Create Task"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Status</TableHead>
                <TableHead>Task & Details</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Origin / Carry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const isOverdue = task.status === "overdue";
                const isDone = task.status === "completed";

                return (
                  <TableRow key={task.id} className={isDone ? "bg-slate-50/40" : ""}>
                    {/* Status Toggle Button */}
                    <TableCell className="text-center">
                      <button
                        onClick={() =>
                          handleStatusChange(
                            task.id,
                            isDone ? "pending" : "completed"
                          )
                        }
                        className={`p-1 rounded-md transition-colors ${
                          isDone
                            ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        }`}
                        title={isDone ? "Mark as Pending" : "Mark as Completed"}
                      >
                        <CheckCircle2 className={`h-4 w-4 ${isDone ? "fill-emerald-600 text-white" : ""}`} />
                      </button>
                    </TableCell>

                    {/* Task Title & Description */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <span
                          className={`text-xs font-semibold text-slate-900 ${
                            isDone ? "line-through text-slate-400" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Owner */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <div className="h-5 w-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-[10px]">
                          {task.owner.slice(0, 1)}
                        </div>
                        <span>{task.owner}</span>
                      </div>
                    </TableCell>

                    {/* Priority Badge */}
                    <TableCell>
                      <Badge
                        variant={
                          task.priority === "urgent"
                            ? "danger"
                            : task.priority === "high"
                            ? "warning"
                            : task.priority === "medium"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {task.priority}
                      </Badge>
                    </TableCell>

                    {/* Due Date */}
                    <TableCell>
                      <span
                        className={`text-xs font-medium ${
                          isOverdue ? "text-rose-600 font-bold" : "text-slate-600"
                        }`}
                      >
                        {formatDate(task.dueDate)}
                      </span>
                    </TableCell>

                    {/* Origin Meeting / Carry Status */}
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {task.carriedOver ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            <Sparkles className="h-2.5 w-2.5" /> Carried Over
                          </span>
                        ) : task.meetingTitle ? (
                          <span
                            className="text-[11px] text-slate-500 truncate max-w-[120px] inline-block"
                            title={task.meetingTitle}
                          >
                            {task.meetingTitle}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Direct task</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions: History & Status select */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            handleStatusChange(task.id, e.target.value as TaskStatus)
                          }
                          className="h-7 text-[11px] rounded border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:border-sky-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="overdue">Overdue</option>
                        </select>

                        <button
                          onClick={() => setHistoryTask(task)}
                          className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors"
                          title="View Task Audit History"
                        >
                          <History className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Task Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <form onSubmit={handleCreateSubmit}>
          <DialogHeader>
            <DialogTitle>Create Action Task</DialogTitle>
            <DialogDescription>
              Assign task ownership, set deadlines, and tie directly to meetings.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="mb-3 p-2 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {formError}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Task Title *</label>
              <Input
                placeholder="e.g. Implement Claude API prompt response parser"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Assignee *</label>
                <Input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="Task owner"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Due Date *</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Priority</label>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Linked Meeting (Optional)</label>
              <Select
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
              >
                <option value="">No linked meeting</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({formatDate(m.date)})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Description</label>
              <Textarea
                placeholder="Technical context, acceptance criteria, or relevant links..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
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
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Task History Audit Modal */}
      <Dialog open={!!historyTask} onOpenChange={(open) => !open && setHistoryTask(null)}>
        {historyTask && (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-sky-600" />
                Task History & Audit Trail
              </DialogTitle>
              <DialogDescription>
                Chronological record of status changes, carry-overs, and owner modifications.
              </DialogDescription>
            </DialogHeader>

            <div className="my-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-900">{historyTask.title}</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Owner: {historyTask.owner} • Due: {formatDate(historyTask.dueDate)} • Status:{" "}
                <span className="font-semibold">{historyTask.status}</span>
              </p>
            </div>

            <div className="space-y-3 mt-4">
              <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Event Timeline
              </h5>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(historyTask.history && historyTask.history.length > 0
                  ? historyTask.history
                  : [
                      {
                        id: "h-init",
                        timestamp: historyTask.createdAt,
                        action: "Task created and assigned",
                        performedBy: historyTask.owner,
                      },
                    ]
                ).map((evt) => (
                  <div key={evt.id} className="relative">
                    <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-sky-500 shadow-xs" />
                    <div>
                      <p className="text-xs font-medium text-slate-800">{evt.action}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(evt.timestamp).toLocaleString()} by {evt.performedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setHistoryTask(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}

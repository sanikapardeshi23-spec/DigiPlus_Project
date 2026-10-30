"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Search,
  Plus,
  History,
  CheckCircle2,
  Sparkles,
  Pencil,
  Trash2,
  AlertTriangle,
  Clock,
  FileText,
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
  const { tasks, addTask, updateTask, deleteTask, meetings, settings } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Modals
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState(settings.userName);
  const [dueDate, setDueDate] = useState("2026-11-06");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [meetingId, setMeetingId] = useState<string>("");
  const [outcome, setOutcome] = useState("");
  const [formError, setFormError] = useState("");

  // Edit form state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editStatus, setEditStatus] = useState<TaskStatus>("pending");
  const [editMeetingId, setEditMeetingId] = useState<string>("");
  const [editOutcome, setEditOutcome] = useState("");
  const [editError, setEditError] = useState("");

  const [todayStr, setTodayStr] = useState("2026-10-30");

  React.useEffect(() => {
    setTodayStr(new Date().toISOString().split("T")[0]);
  }, []);

  // Helper to determine if a task is overdue
  const isTaskOverdue = (t: Task): boolean => {
    if (t.status === "completed") return false;
    if (t.status === "overdue") return true;
    return Boolean(t.dueDate && t.dueDate < todayStr);
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.outcome && t.outcome.toLowerCase().includes(searchQuery.toLowerCase()));

    const overdue = isTaskOverdue(t);

    let matchesStatus = true;
    if (statusFilter === "open") {
      matchesStatus = (t.status === "pending" || t.status === "open") && !overdue;
    } else if (statusFilter === "in_progress") {
      matchesStatus = t.status === "in_progress" && !overdue;
    } else if (statusFilter === "completed") {
      matchesStatus = t.status === "completed";
    } else if (statusFilter === "overdue") {
      matchesStatus = overdue;
    }

    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const overdueCount = tasks.filter((t) => isTaskOverdue(t)).length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Task title is required");
      return;
    }

    const linkedMeeting = meetings.find((m) => m.id === meetingId);

    await addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      owner: owner.trim() || settings.userName,
      dueDate,
      priority,
      status,
      meetingId: meetingId || undefined,
      meetingTitle: linkedMeeting?.title,
      outcome: outcome.trim() || undefined,
      carriedOver: false,
    });

    setTitle("");
    setDescription("");
    setOutcome("");
    setFormError("");
    setCreateDialogOpen(false);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditOwner(task.owner);
    setEditDueDate(task.dueDate);
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditMeetingId(task.meetingId || "");
    setEditOutcome(task.outcome || "");
    setEditError("");
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId) return;
    if (!editTitle.trim()) {
      setEditError("Task title is required");
      return;
    }

    const linkedMeeting = meetings.find((m) => m.id === editMeetingId);

    await updateTask(editingTaskId, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      owner: editOwner.trim() || settings.userName,
      dueDate: editDueDate,
      priority: editPriority,
      status: editStatus,
      meetingId: editMeetingId || undefined,
      meetingTitle: linkedMeeting?.title,
      outcome: editOutcome.trim() || undefined,
    });

    setEditDialogOpen(false);
    setEditingTaskId(null);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmTask) return;
    await deleteTask(deleteConfirmTask.id);
    setDeleteConfirmTask(null);
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
          onClick={() => {
            setTitle("");
            setDescription("");
            setOutcome("");
            setFormError("");
            setDueDate(new Date().toISOString().split("T")[0]);
            setPriority("medium");
            setStatus("pending");
            setCreateDialogOpen(true);
          }}
          className="text-xs bg-sky-600 hover:bg-sky-700 text-white self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          <span>Create Task</span>
        </Button>
      </div>

      {/* Overdue Warning Alert Banner if any overdue tasks exist */}
      {overdueCount > 0 && statusFilter !== "overdue" && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              <strong>Attention needed:</strong> You have <strong>{overdueCount}</strong> overdue{" "}
              {overdueCount === 1 ? "task" : "tasks"} requiring follow-up or rescheduling.
            </span>
          </div>
          <button
            onClick={() => setStatusFilter("overdue")}
            className="text-xs font-semibold underline text-rose-700 hover:text-rose-900 cursor-pointer ml-2 shrink-0"
          >
            View Overdue Tasks
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title, owner, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Filter:</span>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36 text-xs"
            >
              <option value="all">All Tasks ({tasks.length})</option>
              <option value="open">
                Open ({tasks.filter((t) => (t.status === "open" || t.status === "pending") && !isTaskOverdue(t)).length})
              </option>
              <option value="in_progress">
                In Progress ({tasks.filter((t) => t.status === "in_progress" && !isTaskOverdue(t)).length})
              </option>
              <option value="completed">
                Completed ({tasks.filter((t) => t.status === "completed").length})
              </option>
              <option value="overdue">
                Overdue ({overdueCount})
              </option>
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
                <TableHead>Meeting Context</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const overdue = isTaskOverdue(task);
                const isDone = task.status === "completed";

                return (
                  <TableRow
                    key={task.id}
                    className={`${isDone ? "bg-slate-50/50" : overdue ? "bg-rose-50/20" : ""}`}
                  >
                    {/* Status Toggle Button */}
                    <TableCell className="text-center">
                      <button
                        onClick={() =>
                          handleStatusChange(
                            task.id,
                            isDone ? "pending" : "completed"
                          )
                        }
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          isDone
                            ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                            : overdue
                            ? "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        }`}
                        title={isDone ? "Mark as Open / Pending" : "Mark as Completed"}
                      >
                        <CheckCircle2
                          className={`h-4 w-4 ${
                            isDone ? "fill-emerald-600 text-white" : ""
                          }`}
                        />
                      </button>
                    </TableCell>

                    {/* Task Title & Description & Outcome */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-semibold ${
                              isDone
                                ? "line-through text-slate-400"
                                : overdue
                                ? "text-rose-950 font-bold"
                                : "text-slate-900"
                            }`}
                          >
                            {task.title}
                          </span>
                          {overdue && (
                            <Badge variant="danger" className="text-[10px] py-0 px-1.5">
                              Overdue
                            </Badge>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {task.description}
                          </p>
                        )}

                        {task.outcome && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-100 max-w-fit">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="line-clamp-1">Note: {task.outcome}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Owner */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <div className="h-5 w-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-[10px]">
                          {task.owner.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[100px]">{task.owner}</span>
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
                      <div className="flex items-center gap-1">
                        <Clock
                          className={`h-3 w-3 ${
                            overdue
                              ? "text-rose-600"
                              : isDone
                              ? "text-slate-400"
                              : "text-slate-400"
                          }`}
                        />
                        <span
                          className={`text-xs font-medium ${
                            overdue
                              ? "text-rose-600 font-bold"
                              : isDone
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        >
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Meeting Context / Carry-Over Status */}
                    <TableCell>
                      <div className="space-y-0.5">
                        {task.carriedOver ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                              <Sparkles className="h-2.5 w-2.5 text-amber-600" /> Carried Over
                            </span>
                            {task.originalMeetingTitle && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                Orig: {task.originalMeetingTitle}
                              </p>
                            )}
                          </div>
                        ) : task.meetingTitle ? (
                          <span
                            className="text-[11px] text-slate-600 truncate max-w-[130px] block"
                            title={task.meetingTitle}
                          >
                            {task.meetingTitle}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Direct Task</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions: Status Dropdown, Edit, Delete, History */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Status Dropdown */}
                        <select
                          value={task.status}
                          onChange={(e) =>
                            handleStatusChange(task.id, e.target.value as TaskStatus)
                          }
                          className="h-7 text-[11px] rounded border border-slate-200 bg-white px-1.5 text-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="pending">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        {/* Edit Task */}
                        <button
                          onClick={() => handleOpenEdit(task)}
                          className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Task"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {/* View Audit History */}
                        <button
                          onClick={() => setHistoryTask(task)}
                          className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Task Audit History"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete Task */}
                        <button
                          onClick={() => setDeleteConfirmTask(task)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* CREATE TASK MODAL */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Initial Status</label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                >
                  <option value="pending">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Related Meeting (Optional)</label>
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

            <div>
              <label className="block font-medium text-slate-700 mb-1">Outcome or Completion Notes (Optional)</label>
              <Input
                placeholder="e.g. Completed PR #14 merged into main branch"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
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
            <Button type="submit" size="sm" className="bg-sky-600 hover:bg-sky-700 text-white">
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* EDIT TASK MODAL */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <form onSubmit={handleEditSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-sky-600" />
              Edit Task & Record History
            </DialogTitle>
            <DialogDescription>
              Update ownership, due dates, priority, or outcome notes. All changes are permanently recorded in the audit history.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="mb-3 p-2 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {editError}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Task Title *</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Assignee *</label>
                <Input
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  placeholder="Task owner"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Due Date *</label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Priority</label>
                <Select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as Priority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Status</label>
                <Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                >
                  <option value="pending">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Related Meeting</label>
                <Select
                  value={editMeetingId}
                  onChange={(e) => setEditMeetingId(e.target.value)}
                >
                  <option value="">No linked meeting</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({formatDate(m.date)})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Description</label>
              <Textarea
                placeholder="Technical details, criteria, notes..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Outcome or Completion Notes</label>
              <Input
                placeholder="e.g. Delivered PR #24, reviewed and approved"
                value={editOutcome}
                onChange={(e) => setEditOutcome(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-sky-600 hover:bg-sky-700 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog
        open={!!deleteConfirmTask}
        onOpenChange={(open) => !open && setDeleteConfirmTask(null)}
      >
        {deleteConfirmTask && (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <Trash2 className="h-5 w-5" />
                Delete Task
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this task? This action is permanent and will remove all audit history records from Supabase.
              </DialogDescription>
            </DialogHeader>

            <div className="my-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-900">{deleteConfirmTask.title}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Owner: {deleteConfirmTask.owner} • Due: {formatDate(deleteConfirmTask.dueDate)} • Status:{" "}
                <span className="font-semibold">{deleteConfirmTask.status}</span>
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmTask(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDeleteConfirm}
              >
                Delete Permanently
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* TASK HISTORY & AUDIT MODAL */}
      <Dialog open={!!historyTask} onOpenChange={(open) => !open && setHistoryTask(null)}>
        {historyTask && (
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-sky-600" />
                Task Details & Audit History
              </DialogTitle>
              <DialogDescription>
                Chronological record of status changes, carry-overs, and owner modifications.
              </DialogDescription>
            </DialogHeader>

            {/* Task Snapshot Card */}
            <div className="my-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900">{historyTask.title}</h4>
                <Badge
                  variant={
                    historyTask.status === "completed"
                      ? "success"
                      : isTaskOverdue(historyTask)
                      ? "danger"
                      : "default"
                  }
                >
                  {isTaskOverdue(historyTask) ? "Overdue" : historyTask.status}
                </Badge>
              </div>

              {historyTask.description && (
                <p className="text-[11px] text-slate-600">{historyTask.description}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400">Assigned Owner:</span>{" "}
                  <strong className="text-slate-800">{historyTask.owner}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Due Date:</span>{" "}
                  <strong className="text-slate-800">{formatDate(historyTask.dueDate)}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Priority:</span>{" "}
                  <strong className="capitalize text-slate-800">{historyTask.priority}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Related Meeting:</span>{" "}
                  <span className="text-slate-800">
                    {historyTask.meetingTitle || "Direct Task"}
                  </span>
                </div>
              </div>

              {historyTask.carriedOver && (
                <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>
                    Carried forward from{" "}
                    <strong>{historyTask.originalMeetingTitle || "previous sync"}</strong> into{" "}
                    <strong>{historyTask.meetingTitle || "current meeting"}</strong>.
                  </span>
                </div>
              )}

              {historyTask.outcome && (
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-emerald-800">
                  <strong>Outcome / Completion Notes:</strong> {historyTask.outcome}
                </div>
              )}
            </div>

            {/* Event Timeline */}
            <div className="space-y-3 mt-4 max-h-60 overflow-y-auto pr-1">
              <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Event Timeline ({historyTask.history?.length || 0} events)
              </h5>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(historyTask.history && historyTask.history.length > 0
                  ? historyTask.history
                  : [
                      {
                        id: "h-init",
                        timestamp: historyTask.createdAt,
                        action: "Task created",
                        details: "Task initialized in workspace",
                        performedBy: historyTask.owner,
                      },
                    ]
                ).map((evt) => (
                  <div key={evt.id} className="relative">
                    <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-sky-500 shadow-xs" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{evt.action}</p>
                      {evt.details && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{evt.details}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(evt.timestamp).toLocaleString()} by {evt.performedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-4">
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

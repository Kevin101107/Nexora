"use client";
const session = true;

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  Task,
  Milestone,
  ProjectActivity,
  ProjectProgress,
  WorkspaceOverview,
  WorkspaceMemberStats,
  TaskStatus,
  TaskPriority,
  MilestoneStatus,
} from "@/lib/types";
import Dialog from "@/components/ui/Dialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/DataStates";
import {
  Kanban,
  LayoutDashboard,
  Flag,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  ArrowLeft,
  Calendar,
  Filter,
  Check,
  ChevronRight,
  ShieldCheck,
  Loader2,
  X,
  User,
  ArrowRight,
} from "lucide-react";

type TabKey = "overview" | "tasks" | "milestones" | "activity" | "team";

export default function ProjectWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = params.id;
  const router = useRouter();
  const { toast } = useToast();

  const [currentUserId, setCurrentUserId] = useState<string>(DEVELOPMENT_USER_ID);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceOverview | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);

  // Filters for tasks
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [filterMilestoneId, setFilterMilestoneId] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("todo");
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>("");
  const [taskMilestoneId, setTaskMilestoneId] = useState<string>("");
  const [taskDueDate, setTaskDueDate] = useState<string>("");
  const [savingTask, setSavingTask] = useState(false);

  // Milestone Modal state
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [milestoneStatus, setMilestoneStatus] = useState<MilestoneStatus>("planned");
  const [savingMilestone, setSavingMilestone] = useState(false);

  // Fetch all workspace data
  const loadWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAccessDenied(false);
      const api = createApiClient(currentUserId);

      const [wsData, tasksData, milestonesData, activityData] = await Promise.all([
        api.get<WorkspaceOverview>(`/projects/${projectId}/workspace`),
        api.get<Task[]>(`/projects/${projectId}/tasks`),
        api.get<Milestone[]>(`/projects/${projectId}/milestones`),
        api.get<ProjectActivity[]>(`/projects/${projectId}/activity`),
      ]);

      setWorkspace(wsData);
      setTasks(tasksData);
      setMilestones(milestonesData);
      setActivities(activityData);
      setAccessDenied(false);
    } catch (err: any) {
      if (err?.status === 403) {
        setAccessDenied(true);
      } else {
        setError(err?.message || "Failed to load project workspace");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, currentUserId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const isOwner = workspace?.is_owner ?? false;

  // Task Handlers
  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskPriority("medium");
    setTaskStatus("todo");
    setTaskAssigneeId("");
    setTaskMilestoneId("");
    setTaskDueDate("");
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setTaskAssigneeId(task.assignee_id || "");
    setTaskMilestoneId(task.milestone_id || "");
    setTaskDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast("Task title is required", "error");
      return;
    }

    try {
      setSavingTask(true);
      const api = createApiClient(currentUserId);

      if (editingTask) {
        // If non-owner, only update status
        if (!isOwner) {
          await api.patch(`/projects/${projectId}/tasks/${editingTask.id}`, {
            status: taskStatus,
          });
        } else {
          await api.patch(`/projects/${projectId}/tasks/${editingTask.id}`, {
            title: taskTitle.trim(),
            description: taskDesc.trim() || null,
            priority: taskPriority,
            status: taskStatus,
            assignee_id: taskAssigneeId || null,
            milestone_id: taskMilestoneId || null,
            due_date: taskDueDate || null,
          });
        }
        toast("Task changes saved successfully", "success");
      } else {
        await api.post(`/projects/${projectId}/tasks`, {
          title: taskTitle.trim(),
          description: taskDesc.trim() || null,
          priority: taskPriority,
          status: taskStatus,
          assignee_id: taskAssigneeId || null,
          milestone_id: taskMilestoneId || null,
          due_date: taskDueDate || null,
        });
        toast("New task added to board", "success");
      }

      setIsTaskModalOpen(false);
      loadWorkspace();
    } catch (err: any) {
      toast(err.message || "An error occurred while saving task", "error");
    } finally {
      setSavingTask(false);
    }
  };

  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    try {
      const api = createApiClient(currentUserId);
      await api.patch(`/projects/${projectId}/tasks/${task.id}`, {
        status: newStatus,
      });
      toast(`Task moved to ${newStatus.replace("_", " ")}`, "success");
      loadWorkspace();
    } catch (err: any) {
      toast(err.message || "Could not change task status", "error");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const api = createApiClient(currentUserId);
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      toast("Task removed from project", "success");
      setIsTaskModalOpen(false);
      loadWorkspace();
    } catch (err: any) {
      toast(err.message || "Could not delete task", "error");
    }
  };

  // Milestone Handlers
  const handleOpenCreateMilestone = () => {
    setEditingMilestone(null);
    setMilestoneTitle("");
    setMilestoneDesc("");
    setMilestoneDueDate("");
    setMilestoneStatus("planned");
    setIsMilestoneModalOpen(true);
  };

  const handleOpenEditMilestone = (ms: Milestone) => {
    setEditingMilestone(ms);
    setMilestoneTitle(ms.title);
    setMilestoneDesc(ms.description || "");
    setMilestoneDueDate(ms.due_date ? ms.due_date.slice(0, 10) : "");
    setMilestoneStatus(ms.status);
    setIsMilestoneModalOpen(true);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) {
      toast("Milestone title is required", "error");
      return;
    }

    try {
      setSavingMilestone(true);
      const api = createApiClient(currentUserId);

      if (editingMilestone) {
        await api.patch(`/projects/${projectId}/milestones/${editingMilestone.id}`, {
          title: milestoneTitle.trim(),
          description: milestoneDesc.trim() || null,
          due_date: milestoneDueDate || null,
          status: milestoneStatus,
        });
        toast("Milestone saved successfully", "success");
      } else {
        await api.post(`/projects/${projectId}/milestones`, {
          title: milestoneTitle.trim(),
          description: milestoneDesc.trim() || null,
          due_date: milestoneDueDate || null,
          status: milestoneStatus,
        });
        toast("New milestone established", "success");
      }

      setIsMilestoneModalOpen(false);
      loadWorkspace();
    } catch (err: any) {
      toast(err.message || "Could not save milestone", "error");
    } finally {
      setSavingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm("Are you sure you want to delete this milestone? Attached tasks will be detached.")) return;
    try {
      const api = createApiClient(currentUserId);
      await api.delete(`/projects/${projectId}/milestones/${milestoneId}`);
      toast("Milestone removed", "success");
      setIsMilestoneModalOpen(false);
      loadWorkspace();
    } catch (err: any) {
      toast(err.message || "Could not delete milestone", "error");
    }
  };

  // Filtered tasks for Kanban board
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (myTasksOnly && t.assignee_id !== currentUserId) return false;
      if (filterMilestoneId !== "all" && t.milestone_id !== filterMilestoneId) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, myTasksOnly, filterMilestoneId, filterPriority, currentUserId]);

  const todoTasks = useMemo(() => filteredTasks.filter((t) => t.status === "todo"), [filteredTasks]);
  const inProgressTasks = useMemo(() => filteredTasks.filter((t) => t.status === "in_progress"), [filteredTasks]);
  const doneTasks = useMemo(() => filteredTasks.filter((t) => t.status === "done"), [filteredTasks]);

  if (loading) {
    return <LoadingState message="Loading team workspace..." />;
  }

  if (accessDenied) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="card !p-8 text-center space-y-4 border-red-500/20 bg-red-500/[0.03]">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workspace Access Denied</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            You don&apos;t have access to this workspace. Private workspaces are only accessible to the project lead and accepted squad members.
          </p>
          <div className="pt-2 flex justify-center">
            <Link href={`/projects/${projectId}`} className="btn-primary text-xs !py-2 !px-4">
              Return to Project Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <ErrorState
          title="Failed to Load Workspace"
          message={error || "An unexpected error occurred while loading the workspace."}
          onRetry={loadWorkspace}
        />
      </div>
    );
  }

  const { progress } = workspace;

  return (
    <div className="space-y-6 pb-16">
      {/* Workspace Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Project Overview</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <ShieldCheck size={12} />
              <span>{isOwner ? "Project Lead" : "Squad Member"}</span>
            </span>
          </div>
        </div>

        {/* Project Title & Progress Bar Header Banner */}
        <div className="card !p-6 border-primary/20 bg-gradient-to-br from-white/95 to-primary/[0.04] dark:from-[#131322] dark:to-primary/[0.08] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  Team Workspace
                </span>
                <span className="text-xs text-gray-400 capitalize">{workspace.category}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {workspace.title}
              </h1>
              {workspace.description && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {workspace.description}
                </p>
              )}
            </div>

            {/* Quick Progress Indicator */}
            <div className="w-full md:w-64 space-y-2 p-3.5 rounded-2xl bg-white/70 dark:bg-[#16162a]/70 border border-gray-100 dark:border-white/[0.06] shrink-0">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-500 dark:text-gray-400">Project Progress</span>
                <span className="text-primary">{progress.progress_percentage}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress_percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>{progress.completed_tasks} / {progress.total_tasks} tasks done</span>
                <span>{progress.in_progress_tasks} active</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-100 dark:border-white/[0.06] overflow-x-auto gap-1 sm:gap-2 pt-2">
            {[
              { key: "overview", label: "Overview", icon: LayoutDashboard },
              { key: "tasks", label: `Tasks (${tasks.length})`, icon: Kanban },
              { key: "milestones", label: `Milestones (${milestones.length})`, icon: Flag },
              { key: "activity", label: "Activity", icon: Activity },
              { key: "team", label: `Team (${workspace.members.length})`, icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all shrink-0 ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="card !p-4 sm:!p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Progress</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {progress.progress_percentage}%
              </div>
              <p className="text-[11px] text-gray-500">
                {progress.completed_tasks} of {progress.total_tasks} completed
              </p>
            </div>

            <div className="card !p-4 sm:!p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Tasks in Flight</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {progress.in_progress_tasks}
              </div>
              <p className="text-[11px] text-gray-500">
                {progress.todo_tasks} pending in backlog
              </p>
            </div>

            <div className="card !p-4 sm:!p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Active Milestones</span>
                <Flag size={16} className="text-primary" />
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {milestones.filter((m) => m.status === "active").length}
              </div>
              <p className="text-[11px] text-gray-500">
                {milestones.length} total roadmap goals
              </p>
            </div>

            <div className="card !p-4 sm:!p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Squad Members</span>
                <Users size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {workspace.members.length}
              </div>
              <p className="text-[11px] text-gray-500">
                Collaborating on execution
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Milestones & Team preview */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Milestones */}
              <div className="card !p-5 sm:!p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Flag size={16} className="text-primary" />
                    <span>Active Milestones</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("milestones")}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {milestones.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">
                    No milestones yet. Create one to define your next project goal.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {milestones.slice(0, 3).map((ms) => (
                      <div
                        key={ms.id}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04] space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {ms.title}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full capitalize font-semibold bg-primary/10 text-primary">
                            {ms.status}
                          </span>
                        </div>
                        {ms.description && (
                          <p className="text-xs text-gray-500 line-clamp-1">{ms.description}</p>
                        )}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>Progress</span>
                            <span>{ms.progress_percentage}% ({ms.completed_tasks}/{ms.total_tasks} tasks)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${ms.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Squad Workload Overview */}
              <div className="card !p-5 sm:!p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <span>Squad Execution</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("team")}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>View roster</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workspace.members.map((m) => {
                    const name = m.user?.display_name || m.user?.username || m.user_id;
                    const initial = name.charAt(0).toUpperCase();
                    return (
                      <div
                        key={m.user_id}
                        className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04] flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {name}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {m.role_name || (m.member_role === "Owner" ? "Project Lead" : "Squad Member")}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                            <span>{m.completed_tasks_count}/{m.assigned_tasks_count} completed</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Recent Activity Feed */}
            <div className="card !p-5 sm:!p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  <span>Recent Activity</span>
                </h3>
                <button
                  onClick={() => setActiveTab("activity")}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <span>All</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              {activities.length === 0 ? (
                <p className="text-xs text-gray-500 py-8 text-center">
                  Project activity will appear here as your squad starts working.
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 8).map((act) => {
                    const actorName = act.actor?.display_name || act.actor?.username || "Squad member";
                    return (
                      <div key={act.id} className="text-xs space-y-1 pb-3 border-b border-gray-100 dark:border-white/[0.04] last:border-0 last:pb-0">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white">{actorName} </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {act.action_type === "task_created" && `created task "${act.metadata?.task_title}"`}
                              {act.action_type === "task_assigned" && `assigned "${act.metadata?.task_title}" to ${act.metadata?.assignee_name || "member"}`}
                              {act.action_type === "task_status_changed" && `moved "${act.metadata?.task_title}" to ${act.metadata?.new_status?.replace("_", " ")}`}
                              {act.action_type === "task_completed" && `completed task "${act.metadata?.task_title}"`}
                              {act.action_type === "task_deleted" && `deleted task "${act.metadata?.task_title}"`}
                              {act.action_type === "milestone_created" && `created milestone "${act.metadata?.milestone_title}"`}
                              {act.action_type === "milestone_updated" && `updated milestone "${act.metadata?.milestone_title}"`}
                              {act.action_type === "milestone_completed" && `completed milestone "${act.metadata?.milestone_title}"`}
                              {act.action_type === "member_joined" && `joined the squad`}
                              {act.action_type === "member_removed" && `was removed from squad`}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 pl-4">
                          {act.created_at ? new Date(act.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "Recently"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TASKS TAB (KANBAN BOARD) */}
      {activeTab === "tasks" && (
        <div className="space-y-5">
          {/* Controls & Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#131322] border border-gray-200/80 dark:border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMyTasksOnly(!myTasksOnly)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  myTasksOnly
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08]"
                }`}
              >
                <User size={13} />
                <span>My Tasks</span>
              </button>

              {/* Milestone Filter */}
              <select
                value={filterMilestoneId}
                onChange={(e) => setFilterMilestoneId(e.target.value)}
                aria-label="Filter by milestone"
                className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 border-0 focus:ring-1 focus:ring-primary max-w-[170px] truncate"
              >
                <option value="all">All Milestones</option>
                {milestones.map((ms) => (
                  <option key={ms.id} value={ms.id}>
                    {ms.title}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                aria-label="Filter by priority"
                className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 border-0 focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={handleOpenCreateTask}
                className="btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} />
                <span>Create Task</span>
              </button>
            )}
          </div>

          {/* Kanban Columns */}
          {tasks.length === 0 ? (
            <div className="card !p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 flex items-center justify-center mx-auto">
                <Kanban size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No tasks yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No tasks yet. Create the first task to start organizing your project.
              </p>
              {isOwner && (
                <button
                  type="button"
                  onClick={handleOpenCreateTask}
                  className="btn-primary text-xs !py-2 !px-4 inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Create First Task</span>
                </button>
              )}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="card !p-10 text-center space-y-2">
              <p className="text-xs text-gray-500">
                {myTasksOnly ? "You don't have any assigned tasks yet." : "No tasks match the active filters."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMyTasksOnly(false);
                  setFilterMilestoneId("all");
                  setFilterPriority("all");
                }}
                className="btn-outline text-xs !py-1 !px-3"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
              {/* Column 1: TODO */}
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      To Do
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500">
                    {todoTasks.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {todoTasks.map((t) => renderTaskCard(t))}
                  {todoTasks.length === 0 && (
                    <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.06] text-center text-xs text-gray-400">
                      No tasks in To Do
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: IN PROGRESS */}
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      In Progress
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                    {inProgressTasks.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {inProgressTasks.map((t) => renderTaskCard(t))}
                  {inProgressTasks.length === 0 && (
                    <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.06] text-center text-xs text-gray-400">
                      No active tasks
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: DONE */}
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Done
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    {doneTasks.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {doneTasks.map((t) => renderTaskCard(t))}
                  {doneTasks.length === 0 && (
                    <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.06] text-center text-xs text-gray-400">
                      No completed tasks yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MILESTONES TAB */}
      {activeTab === "milestones" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Project Milestones</h2>
              <p className="text-xs text-gray-500">Track key phases and deliverables toward project goals.</p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={handleOpenCreateMilestone}
                className="btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Create Milestone</span>
              </button>
            )}
          </div>

          {milestones.length === 0 ? (
            <div className="card !p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 flex items-center justify-center mx-auto">
                <Flag size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No milestones yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No milestones yet. Create one to define your next project goal.
              </p>
              {isOwner && (
                <button
                  type="button"
                  onClick={handleOpenCreateMilestone}
                  className="btn-primary text-xs !py-2 !px-4 inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Define First Milestone</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestones.map((ms) => {
                const statusColor =
                  ms.status === "completed"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : ms.status === "active"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-gray-100 dark:bg-white/[0.06] text-gray-400 border-transparent";

                return (
                  <div
                    key={ms.id}
                    className="card !p-6 space-y-4 border-gray-100 dark:border-white/[0.06] hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColor}`}>
                            {ms.status}
                          </span>
                          {ms.due_date && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar size={12} />
                              <span>{new Date(ms.due_date).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {ms.title}
                        </h3>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMilestone(ms)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                            title="Edit Milestone"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(ms.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                            title="Delete Milestone"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {ms.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {ms.description}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-white/[0.04]">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-400">Completion</span>
                        <span className="text-primary">{ms.progress_percentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${ms.progress_percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>{ms.completed_tasks} / {ms.total_tasks} tasks done</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterMilestoneId(ms.id);
                            setActiveTab("tasks");
                          }}
                          className="text-primary hover:underline"
                        >
                          View Tasks
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. ACTIVITY TAB */}
      {activeTab === "activity" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Activity Log</h2>
            <p className="text-xs text-gray-500">Audit trail of tasks, milestones, and squad membership events.</p>
          </div>

          {activities.length === 0 ? (
            <div className="card !p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 flex items-center justify-center mx-auto">
                <Activity size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No activity yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Project activity will appear here as your squad starts working.
              </p>
            </div>
          ) : (
            <div className="card !p-6">
              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-white/[0.06]">
                {activities.map((act) => {
                  const actorName = act.actor?.display_name || act.actor?.username || "Squad member";

                  return (
                    <div key={act.id} className="relative flex items-start gap-3">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-[#16162a] border-2 border-primary flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                          <span className="font-bold text-gray-900 dark:text-white">{actorName}</span>
                          {act.action_type === "task_created" && (
                            <span>created task <strong className="text-primary font-bold">&quot;{act.metadata?.task_title}&quot;</strong></span>
                          )}
                          {act.action_type === "task_assigned" && (
                            <span>assigned <strong className="text-primary font-bold">&quot;{act.metadata?.task_title}&quot;</strong> to <strong>{act.metadata?.assignee_name || "a member"}</strong></span>
                          )}
                          {act.action_type === "task_status_changed" && (
                            <span>moved <strong className="text-primary font-bold">&quot;{act.metadata?.task_title}&quot;</strong> from <em>{act.metadata?.old_status}</em> to <strong>{act.metadata?.new_status?.replace("_", " ")}</strong></span>
                          )}
                          {act.action_type === "task_completed" && (
                            <span className="text-emerald-500 font-semibold">completed task &quot;{act.metadata?.task_title}&quot;</span>
                          )}
                          {act.action_type === "task_deleted" && (
                            <span>deleted task &quot;{act.metadata?.task_title}&quot;</span>
                          )}
                          {act.action_type === "milestone_created" && (
                            <span>created milestone <strong className="text-purple-400 font-bold">&quot;{act.metadata?.milestone_title}&quot;</strong></span>
                          )}
                          {act.action_type === "milestone_updated" && (
                            <span>updated milestone <strong className="text-purple-400 font-bold">&quot;{act.metadata?.milestone_title}&quot;</strong></span>
                          )}
                          {act.action_type === "milestone_completed" && (
                            <span className="text-emerald-500 font-semibold">completed milestone &quot;{act.metadata?.milestone_title}&quot;</span>
                          )}
                          {act.action_type === "member_joined" && (
                            <span>joined the project squad</span>
                          )}
                          {act.action_type === "member_removed" && (
                            <span className="text-red-400 font-medium">removed member {act.metadata?.member_name || ""} from squad</span>
                          )}
                        </div>

                        <p className="text-[11px] text-gray-400">
                          {act.created_at ? new Date(act.created_at).toLocaleString() : "Recently"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TEAM TAB */}
      {activeTab === "team" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Squad Workload & Contributions</h2>
              <p className="text-xs text-gray-500">View team responsibilities and task completion statistics.</p>
            </div>
            <Link
              href={`/projects/${projectId}`}
              className="btn-outline text-xs !py-1.5 !px-3"
            >
              Manage Roles & Applications
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspace.members.map((m) => {
              const name = m.user?.display_name || m.user?.username || m.user_id;
              const initial = name.charAt(0).toUpperCase();
              const isLead = m.member_role === "Owner";
              const isCurrentUser = m.user_id === currentUserId;
              const pct = m.assigned_tasks_count > 0 ? Math.round((m.completed_tasks_count / m.assigned_tasks_count) * 100) : 0;

              return (
                <div
                  key={m.user_id}
                  className="card !p-5 space-y-4 border-gray-100 dark:border-white/[0.06] hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary font-black text-sm flex items-center justify-center shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {name}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/15 text-primary">
                            You
                          </span>
                        )}
                      </div>
                      {m.user?.username && (
                        <Link
                          href={`/profile/${m.user.username}`}
                          className="text-xs text-primary hover:underline truncate block"
                        >
                          @{m.user.username}
                        </Link>
                      )}
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isLead
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      {isLead ? "Lead" : "Member"}
                    </span>
                  </div>

                  {m.role_name && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span>Role: </span>
                      <strong className="text-gray-700 dark:text-gray-200">{m.role_name}</strong>
                    </div>
                  )}

                  {/* Task metrics */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-white/[0.04]">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-400">Assigned Tasks</span>
                      <span className="text-gray-900 dark:text-white">
                        {m.completed_tasks_count} / {m.assigned_tasks_count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TASK MODAL (Create / Edit) */}
      <Dialog
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTask ? (isOwner ? "Edit Task" : "Task Details") : "Create New Task"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div>
            <label htmlFor="task-modal-title" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              id="task-modal-title"
              type="text"
              disabled={!isOwner && !!editingTask}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Implement OAuth login API"
              className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] disabled:opacity-60"
              required
            />
          </div>

          <div>
            <label htmlFor="task-modal-desc" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="task-modal-desc"
              disabled={!isOwner && !!editingTask}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Task details and acceptance criteria..."
              rows={3}
              className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-modal-status" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                id="task-modal-status"
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-modal-priority" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                id="task-modal-priority"
                disabled={!isOwner && !!editingTask}
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] disabled:opacity-60"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-modal-assignee" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Assignee
              </label>
              <select
                id="task-modal-assignee"
                disabled={!isOwner && !!editingTask}
                value={taskAssigneeId}
                onChange={(e) => setTaskAssigneeId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {workspace.members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.display_name || m.user?.username || m.user_id} ({m.member_role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-modal-milestone" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Milestone
              </label>
              <select
                id="task-modal-milestone"
                disabled={!isOwner && !!editingTask}
                value={taskMilestoneId}
                onChange={(e) => setTaskMilestoneId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] disabled:opacity-60"
              >
                <option value="">None (Independent Task)</option>
                {milestones.map((ms) => (
                  <option key={ms.id} value={ms.id}>
                    {ms.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="task-modal-due-date" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Due Date
            </label>
            <input
              id="task-modal-due-date"
              type="date"
              disabled={!isOwner && !!editingTask}
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] disabled:opacity-60"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/[0.06]">
            {editingTask && isOwner ? (
              <button
                type="button"
                onClick={() => handleDeleteTask(editingTask.id)}
                className="text-xs text-red-500 hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 size={13} />
                <span>Delete Task</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="btn-outline text-xs !py-1.5 !px-3.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingTask}
                className="btn-primary text-xs !py-1.5 !px-4 flex items-center gap-1.5"
              >
                {savingTask && <Loader2 size={13} className="animate-spin" />}
                <span>{editingTask ? "Save Changes" : "Create Task"}</span>
              </button>
            </div>
          </div>
        </form>
      </Dialog>

      {/* MILESTONE MODAL (Create / Edit) */}
      <Dialog
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        title={editingMilestone ? "Edit Milestone" : "Create New Milestone"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveMilestone} className="space-y-4">
          <div>
            <label htmlFor="milestone-modal-title" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              id="milestone-modal-title"
              type="text"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              placeholder="e.g. MVP Launch or Alpha Demo"
              className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]"
              required
            />
          </div>

          <div>
            <label htmlFor="milestone-modal-desc" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="milestone-modal-desc"
              value={milestoneDesc}
              onChange={(e) => setMilestoneDesc(e.target.value)}
              placeholder="Milestone goals and outcomes..."
              rows={3}
              className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="milestone-modal-status" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                id="milestone-modal-status"
                value={milestoneStatus}
                onChange={(e) => setMilestoneStatus(e.target.value as MilestoneStatus)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]"
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label htmlFor="milestone-modal-due-date" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                id="milestone-modal-due-date"
                type="date"
                value={milestoneDueDate}
                onChange={(e) => setMilestoneDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/[0.06]">
            {editingMilestone && isOwner ? (
              <button
                type="button"
                onClick={() => handleDeleteMilestone(editingMilestone.id)}
                className="text-xs text-red-500 hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMilestoneModalOpen(false)}
                className="btn-outline text-xs !py-1.5 !px-3.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingMilestone}
                className="btn-primary text-xs !py-1.5 !px-4 flex items-center gap-1.5"
              >
                {savingMilestone && <Loader2 size={13} className="animate-spin" />}
                <span>{editingMilestone ? "Save Milestone" : "Create Milestone"}</span>
              </button>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );

  function renderTaskCard(t: Task) {
    const priorityColor =
      t.priority === "high"
        ? "bg-red-500/10 text-red-500 border-red-500/20"
        : t.priority === "medium"
        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
        : "bg-blue-500/10 text-blue-500 border-blue-500/20";

    const isAssignedToMe = t.assignee_id === currentUserId;
    const canUpdateStatus = isOwner || isAssignedToMe;
    const assigneeName = t.assignee?.display_name || t.assignee?.username || "Unassigned";

    return (
      <div
        key={t.id}
        role="button"
        tabIndex={0}
        aria-label={`Task: ${t.title}. Status: ${t.status.replace("_", " ")}. Click to view or edit.`}
        className="card !p-4 space-y-3 border-gray-100 dark:border-white/[0.05] hover:border-primary/30 transition-all cursor-pointer shadow-sm group min-w-0 max-w-full break-words"
        onClick={() => handleOpenEditTask(t)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenEditTask(t);
          }
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize ${priorityColor}`}>
            {t.priority}
          </span>
          {t.milestone_title && (
            <span className="text-[10px] text-gray-400 font-semibold truncate max-w-[120px] bg-gray-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded">
              {t.milestone_title}
            </span>
          )}
        </div>

        <div>
          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
            {t.title}
          </h4>
          {t.description && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {t.description}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-white/[0.04] flex items-center justify-between text-[11px]">
          {/* Assignee */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
              {assigneeName.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-500 dark:text-gray-400 truncate max-w-[90px]">
              {assigneeName}
            </span>
          </div>

          {/* Quick status cycle button */}
          {canUpdateStatus && (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {t.status !== "done" && (
                <button
                  type="button"
                  title="Mark Done"
                  aria-label="Mark Done"
                  onClick={() => handleQuickStatusChange(t, "done")}
                  className="p-1.5 rounded hover:bg-emerald-500/15 text-gray-400 hover:text-emerald-500 transition-colors"
                >
                  <Check size={14} />
                </button>
              )}
              {t.status === "todo" && (
                <button
                  type="button"
                  title="Move to In Progress"
                  aria-label="Move to In Progress"
                  onClick={() => handleQuickStatusChange(t, "in_progress")}
                  className="p-1.5 rounded hover:bg-amber-500/15 text-gray-400 hover:text-amber-500 transition-colors"
                >
                  <Clock size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

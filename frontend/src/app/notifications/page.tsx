"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  NotificationItem,
  NotificationListResponse,
  NotificationPreferences,
} from "@/lib/types";
import {
  Bell,
  CheckCheck,
  Trash2,
  SlidersHorizontal,
  ArrowRight,
  Users,
  CheckSquare,
  Flag,
  FolderGit2,
  Clock,
  Loader2,
  X,
  Check,
  Inbox,
  AlertCircle,
} from "lucide-react";

type StatusFilter = "all" | "unread" | "read";
type CategoryFilter =
  | "all"
  | "team_updates"
  | "task_updates"
  | "milestone_updates"
  | "project_updates";

export default function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(
    null
  );
  const [savingPref, setSavingPref] = useState(false);

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    const api = createApiClient(DEVELOPMENT_USER_ID);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("filter", statusFilter);
      }
      if (categoryFilter !== "all") {
        params.set("category", categoryFilter);
      }
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const res = await api.get<NotificationListResponse>(
        `/notifications${queryStr}`
      );
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err: any) {
      setError("Unable to load notifications.");
      toast(err?.message || "Unable to load notifications.", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, toast]);

  // Fetch preferences
  const loadPreferences = useCallback(async () => {
    const api = createApiClient(DEVELOPMENT_USER_ID);
    try {
      const res = await api.get<NotificationPreferences>(
        "/notifications/preferences"
      );
      setPreferences(res);
    } catch {
      // Non-critical, fallback to defaults
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [loadNotifications, loadPreferences]);

  // Mark single as read & optionally navigate
  async function handleNotificationClick(notif: NotificationItem) {
    if (!notif.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new Event("notifications_updated"));

      const api = createApiClient(DEVELOPMENT_USER_ID);
      try {
        await api.patch(`/notifications/${notif.id}/read`);
      } catch (err: any) {
        toast("Failed to update notification status.", "error");
      }
    }

    if (notif.action_url) {
      router.push(notif.action_url);
    }
  }

  // Mark all as read
  async function handleMarkAllAsRead() {
    const api = createApiClient(DEVELOPMENT_USER_ID);
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("notifications_updated"));
      toast("All notifications marked as read.");
    } catch (err: any) {
      toast("Unable to mark all notifications as read.", "error");
    }
  }

  // Clear read notifications
  async function handleClearRead() {
    const api = createApiClient(DEVELOPMENT_USER_ID);
    try {
      await api.delete("/notifications/read");
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      window.dispatchEvent(new Event("notifications_updated"));
      toast("Cleared read notifications.");
    } catch (err: any) {
      toast("Unable to clear read notifications.", "error");
    }
  }

  // Delete single notification
  async function handleDeleteNotification(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const notif = notifications.find((n) => n.id === id);
    const wasUnread = notif && !notif.is_read;

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    window.dispatchEvent(new Event("notifications_updated"));

    const api = createApiClient(DEVELOPMENT_USER_ID);
    try {
      await api.delete(`/notifications/${id}`);
      toast("Notification deleted.");
    } catch (err: any) {
      toast("Notification could not be found.", "error");
      loadNotifications();
    }
  }

  // Update preferences
  async function handleTogglePreference(
    key: keyof Pick<
      NotificationPreferences,
      "team_updates" | "task_updates" | "milestone_updates" | "project_updates"
    >
  ) {
    if (!preferences) return;
    const newVal = !preferences[key];
    const updated = { ...preferences, [key]: newVal };
    setPreferences(updated);
    setSavingPref(true);

    const api = createApiClient(DEVELOPMENT_USER_ID);
    try {
      const res = await api.patch<NotificationPreferences>(
        "/notifications/preferences",
        { [key]: newVal }
      );
      setPreferences(res);
      toast("Preferences saved.");
    } catch (err: any) {
      toast("Unable to update notification preferences.", "error");
      setPreferences(preferences); // rollback
    } finally {
      setSavingPref(false);
    }
  }

  // Relative timestamp formatting
  function formatRelativeTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return "just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  // Get icon for notification
  function getNotificationIcon(type: string) {
    if (type.startsWith("team_") || type.startsWith("application_") || type.startsWith("member_")) {
      return <Users className="w-4 h-4 text-purple-400" />;
    }
    if (type.startsWith("task_")) {
      return <CheckSquare className="w-4 h-4 text-emerald-400" />;
    }
    if (type.startsWith("milestone_")) {
      return <Flag className="w-4 h-4 text-amber-400" />;
    }
    if (type.startsWith("project_")) {
      return <FolderGit2 className="w-4 h-4 text-blue-400" />;
    }
    return <Bell className="w-4 h-4 text-primary" />;
  }

  // Render empty state message
  function getEmptyMessage() {
    if (statusFilter === "unread") {
      return "You're all caught up.";
    }
    if (statusFilter === "read") {
      return "No read notifications yet.";
    }
    return "No notifications yet. Updates from your projects and squads will appear here.";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              Inbox
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
            Stay updated on team invitations, project assignments, and milestones.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2 text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white"
              title="Mark all notifications as read"
            >
              <CheckCheck size={15} />
              <span>Mark all read</span>
            </button>
          )}

          {notifications.some((n) => n.is_read) && (
            <button
              onClick={handleClearRead}
              className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-2 text-gray-700 dark:text-white/70 hover:text-red-400"
              title="Clear all read notifications"
            >
              <Trash2 size={15} />
              <span>Clear read</span>
            </button>
          )}

          <button
            onClick={() => setShowPreferences((p) => !p)}
            className={`btn-ghost flex items-center gap-1.5 text-xs px-3 py-2 border ${
              showPreferences
                ? "border-primary text-primary bg-primary/10"
                : "border-gray-200 dark:border-white/[0.08] text-gray-700 dark:text-white/70"
            }`}
            title="Notification Preferences"
          >
            <SlidersHorizontal size={15} />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* Preferences Drawer / Card */}
      {showPreferences && preferences && (
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08] space-y-4 animate-fade-up">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Notification Preferences
              </h3>
              <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
                Choose which events create notifications for your account.
              </p>
            </div>
            <button
              onClick={() => setShowPreferences(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Team Updates */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Team Updates
                </span>
                <p className="text-[11px] text-gray-500 dark:text-white/40 leading-tight">
                  Invitations, applications, and squad member joins/leaves
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference("team_updates")}
                disabled={savingPref}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.team_updates ? "bg-primary" : "bg-gray-300 dark:bg-white/20"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    preferences.team_updates ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Task Updates */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Task Updates
                </span>
                <p className="text-[11px] text-gray-500 dark:text-white/40 leading-tight">
                  Assignments, reassignments, status changes, and completions
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference("task_updates")}
                disabled={savingPref}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.task_updates ? "bg-primary" : "bg-gray-300 dark:bg-white/20"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    preferences.task_updates ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Milestone Updates */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Milestone Updates
                </span>
                <p className="text-[11px] text-gray-500 dark:text-white/40 leading-tight">
                  Milestone creations, deadline shifts, and completions
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference("milestone_updates")}
                disabled={savingPref}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.milestone_updates ? "bg-primary" : "bg-gray-300 dark:bg-white/20"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    preferences.milestone_updates ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Project Updates */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Project Updates
                </span>
                <p className="text-[11px] text-gray-500 dark:text-white/40 leading-tight">
                  Project role fill and reopen notifications
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePreference("project_updates")}
                disabled={savingPref}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.project_updates ? "bg-primary" : "bg-gray-300 dark:bg-white/20"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                    preferences.project_updates ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.04] w-fit">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "all"
                ? "bg-white dark:bg-primary text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("unread")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "unread"
                ? "bg-white dark:bg-primary text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === "unread"
                    ? "bg-white/20 text-white"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter("read")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "read"
                ? "bg-white dark:bg-primary text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Read
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "all", label: "All Types" },
            { id: "team_updates", label: "Team" },
            { id: "task_updates", label: "Tasks" },
            { id: "milestone_updates", label: "Milestones" },
            { id: "project_updates", label: "Projects" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCategoryFilter(id as CategoryFilter)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                categoryFilter === id
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm"
                  : "bg-gray-50 dark:bg-white/[0.03] text-gray-600 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs text-gray-500 dark:text-white/40">
            Loading notifications...
          </span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm font-semibold text-red-400">{error}</p>
          <button
            onClick={loadNotifications}
            className="btn-ghost text-xs text-red-400 hover:text-red-300 underline"
          >
            Try again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-gray-50 dark:bg-white/[0.01] border border-dashed border-gray-200 dark:border-white/[0.06] p-8 space-y-3">
          <Inbox className="w-10 h-10 text-gray-400 dark:text-white/20 mx-auto" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {getEmptyMessage()}
          </h3>
          <p className="text-xs text-gray-500 dark:text-white/40 max-w-sm mx-auto">
            When team requests are sent, milestones shift, or tasks are assigned,
            they will automatically surface right here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => {
            const isUnread = !notif.is_read;
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isUnread
                    ? "bg-white dark:bg-[#12121f] border-primary/30 dark:border-primary/40 shadow-sm hover:border-primary"
                    : "bg-white/60 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.05] hover:bg-white dark:hover:bg-white/[0.04] opacity-80 hover:opacity-100"
                }`}
              >
                {/* Left side: icon, dot, actor, title, message */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Indicator dot + Icon container */}
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        isUnread
                          ? "bg-primary/10 border-primary/25"
                          : "bg-gray-100 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.05]"
                      }`}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>
                    {isUnread && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-[#12121f]" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm tracking-tight ${
                          isUnread
                            ? "font-bold text-gray-900 dark:text-white"
                            : "font-semibold text-gray-700 dark:text-white/80"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[11px] text-gray-400 dark:text-white/40 flex items-center gap-1">
                        <Clock size={11} />
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-white/65 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Optional actor preview */}
                    {notif.actor && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                          {notif.actor.display_name?.charAt(0) || "U"}
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-white/50">
                          {notif.actor.display_name || notif.actor.username}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Action deep-link button + delete */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {notif.action_url && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      <span>View</span>
                      <ArrowRight size={13} />
                    </span>
                  )}

                  <button
                    onClick={(e) => handleDeleteNotification(e, notif.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";
const session = true;

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { TeammateRequest, ProjectApplication } from "@/lib/types";
import {
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FolderGit2,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [receivedRequests, setReceivedRequests] = useState<TeammateRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<TeammateRequest[]>([]);
  const [myApplications, setMyApplications] = useState<ProjectApplication[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);

    if (!session) {
      setLoading(false);
      return;
    }

    const api = createApiClient(DEVELOPMENT_USER_ID);
    try {
      const [rec, sent, apps] = await Promise.all([
        api.get<TeammateRequest[]>("/requests?direction=received").catch(() => []),
        api.get<TeammateRequest[]>("/requests?direction=sent").catch(() => []),
        api.get<ProjectApplication[]>("/applications/me").catch(() => []),
      ]);

      setReceivedRequests(rec || []);
      setSentRequests(sent || []);
      setMyApplications(apps || []);
    } catch (err: any) {
      toast("Failed to load requests", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Accept or decline teammate request
  async function handleRespondTeammateRequest(id: string, action: "accepted" | "declined") {
    try {

      if (!session) return;
      const api = createApiClient(DEVELOPMENT_USER_ID);
      await api.post(`/requests/${id}/respond`, { action });
      toast(`Connection request ${action}!`);
      loadData();
    } catch (err: any) {
      toast(err?.message || "Failed to respond", "error");
    }
  }

  // Cancel teammate request
  async function handleCancelTeammateRequest(id: string) {
    try {

      if (!session) return;
      const api = createApiClient(DEVELOPMENT_USER_ID);
      await api.post(`/requests/${id}/cancel`);
      toast("Connection request cancelled");
      loadData();
    } catch (err: any) {
      toast(err?.message || "Failed to cancel request", "error");
    }
  }

  // Withdraw project application
  async function handleWithdrawApplication(id: string) {
    try {

      if (!session) return;
      const api = createApiClient(DEVELOPMENT_USER_ID);
      await api.post(`/applications/${id}/withdraw`);
      toast("Application withdrawn");
      loadData();
    } catch (err: any) {
      toast(err?.message || "Failed to withdraw application", "error");
    }
  }

  const pendingReceivedCount = receivedRequests.filter((r) => r.status === "pending").length;
  const pendingSentCount =
    sentRequests.filter((r) => r.status === "pending").length +
    myApplications.filter((a) => a.status === "pending").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Inbox size={18} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Requests & Applications
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Manage incoming teammate invitations and track your outgoing project applications.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/[0.05] rounded-2xl w-fit text-xs font-bold">
        <button
          onClick={() => setActiveTab("received")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "received"
              ? "bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Received ({pendingReceivedCount})
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "sent"
              ? "bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Sent ({pendingSentCount})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "received" ? (
        /* Received Tab */
        <div className="space-y-4">
          {receivedRequests.length === 0 ? (
            <div className="card !p-12 text-center text-gray-400 space-y-2">
              <p className="text-sm font-semibold">No received requests right now.</p>
              <p className="text-xs">
                When other student builders invite you to collaborate, their requests will appear here.
              </p>
            </div>
          ) : (
            receivedRequests.map((req) => {
              const senderName =
                req.sender?.display_name || req.sender?.username || "Student Builder";
              const initial = senderName.charAt(0).toUpperCase();
              const isPending = req.status === "pending";

              return (
                <div key={req.id} className="card !p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {initial}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                            {senderName}
                          </h3>
                          {req.sender?.username && (
                            <Link
                              href={`/profile/${req.sender.username}`}
                              className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                            >
                              @{req.sender.username}
                              <ExternalLink size={10} />
                            </Link>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {req.sender?.headline || "Student Builder"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full self-start sm:self-center capitalize ${
                        req.status === "accepted"
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                          : req.status === "declined"
                          ? "bg-red-50 dark:bg-red-500/10 text-red-600"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {req.status === "pending" ? "Teammate Request" : req.status}
                    </span>
                  </div>

                  {req.project_title && (
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      In relation to project: <strong>{req.project_title}</strong>
                    </div>
                  )}

                  {req.message && (
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] text-xs text-gray-600 dark:text-gray-300">
                      {req.message}
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => handleRespondTeammateRequest(req.id, "declined")}
                        className="btn-outline !py-1.5 !px-3 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                      >
                        <XCircle size={14} />
                        <span>Decline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondTeammateRequest(req.id, "accepted")}
                        className="btn-primary !py-1.5 !px-4 text-xs flex items-center gap-1"
                      >
                        <CheckCircle2 size={14} />
                        <span>Accept</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Sent Tab */
        <div className="space-y-6">
          {/* Sent Teammate Invitations */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Sent Teammate Invitations ({sentRequests.length})
            </h2>

            {sentRequests.length === 0 ? (
              <div className="card !p-6 text-center text-gray-400 text-xs">
                No outgoing teammate requests. Explore builders on{" "}
                <Link href="/discover" className="text-primary hover:underline font-semibold">
                  Discover
                </Link>{" "}
                to connect!
              </div>
            ) : (
              sentRequests.map((req) => {
                const receiverName =
                  req.receiver?.display_name || req.receiver?.username || "Builder";
                const isPending = req.status === "pending";

                return (
                  <div key={req.id} className="card !p-5 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                          Invitation to {receiverName}
                        </h3>
                        {req.receiver?.headline && (
                          <p className="text-xs text-gray-400">{req.receiver.headline}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                            req.status === "accepted"
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                              : req.status === "declined"
                              ? "bg-red-50 dark:bg-red-500/10 text-red-600"
                              : req.status === "cancelled"
                              ? "bg-gray-100 dark:bg-white/10 text-gray-400"
                              : "bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {req.status}
                        </span>

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleCancelTeammateRequest(req.id)}
                            className="btn-outline !py-1 !px-2.5 text-xs text-gray-400 hover:text-red-500"
                            title="Cancel request"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {req.message && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 pt-1">
                        &quot;{req.message}&quot;
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sent Project Applications */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Submitted Project Applications ({myApplications.length})
            </h2>

            {myApplications.length === 0 ? (
              <div className="card !p-6 text-center text-gray-400 text-xs">
                You haven&apos;t applied to any projects yet. Check out{" "}
                <Link href="/projects" className="text-primary hover:underline font-semibold">
                  Explore Projects
                </Link>{" "}
                to join a squad!
              </div>
            ) : (
              myApplications.map((app) => {
                const isPending = app.status === "pending";

                return (
                  <div key={app.id} className="card !p-5 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                            {app.project_title || "Project Application"}
                          </h3>
                          <Link
                            href={`/projects/${app.project_id}`}
                            className="text-gray-400 hover:text-primary transition-colors"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Role: <strong className="text-primary">{app.role_name || "General Member"}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                            app.status === "accepted"
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                              : app.status === "rejected"
                              ? "bg-red-50 dark:bg-red-500/10 text-red-600"
                              : app.status === "withdrawn"
                              ? "bg-gray-100 dark:bg-white/10 text-gray-400"
                              : "bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {app.status}
                        </span>

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleWithdrawApplication(app.id)}
                            className="btn-outline !py-1 !px-2.5 text-xs text-gray-400 hover:text-red-500"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>

                    {app.message && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 pt-1">
                        &quot;{app.message}&quot;
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

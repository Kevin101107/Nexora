"use client";

import { useState } from "react";
import {
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FolderGit2,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface RequestItem {
  id: string;
  type: "project_application" | "teammate_connect";
  senderName: string;
  senderRole: string;
  projectTitle?: string;
  roleApplied?: string;
  message: string;
  timeAgo: string;
  status: "pending" | "accepted" | "declined";
}

const INITIAL_RECEIVED: RequestItem[] = [
  {
    id: "r1",
    type: "project_application",
    senderName: "Priya Malhotra",
    senderRole: "Frontend Engineer • Year 3",
    projectTitle: "Campus Pulse Radar",
    roleApplied: "Mobile Developer",
    message: "Hey! I saw your post looking for a mobile dev. I have 1.5 years experience with React Native and would love to build the campus map view.",
    timeAgo: "2 hours ago",
    status: "pending",
  },
  {
    id: "r2",
    type: "teammate_connect",
    senderName: "Rahul Verma",
    senderRole: "AI / Python Builder • Year 4",
    message: "Hi! Looking for a teammate for the upcoming Fall Hackathon. Saw your stack and think we could build an agent workflow together.",
    timeAgo: "Yesterday",
    status: "pending",
  },
];

const INITIAL_SENT: RequestItem[] = [
  {
    id: "s1",
    type: "project_application",
    senderName: "You",
    senderRole: "Full-Stack Engineer",
    projectTitle: "OpenCoursePrereq",
    roleApplied: "Fullstack Contributor",
    message: "Interested in contributing to the curriculum visualizer pipeline.",
    timeAgo: "3 days ago",
    status: "pending",
  },
];

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<RequestItem[]>(INITIAL_RECEIVED);
  const { toast } = useToast();

  function handleAction(id: string, action: "accepted" | "declined") {
    setReceived((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item))
    );
    toast(`Request ${action}!`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
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
          Manage incoming project join applications and teammate invitations.
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
          Received ({received.filter((r) => r.status === "pending").length})
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "sent"
              ? "bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Sent ({INITIAL_SENT.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "received" ? (
        <div className="space-y-4">
          {received.length === 0 ? (
            <div className="card !p-8 text-center text-gray-400">
              No received requests right now.
            </div>
          ) : (
            received.map((req) => (
              <div key={req.id} className="card !p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {req.senderName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                        {req.senderName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{req.senderRole}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock size={12} /> {req.timeAgo}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {req.type === "project_application" ? "Project Application" : "Connection Request"}
                    </span>
                  </div>
                </div>

                {req.projectTitle && (
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Applying to: <strong>{req.projectTitle}</strong> (Role:{" "}
                    <span className="text-primary font-bold">{req.roleApplied}</span>)
                  </div>
                )}

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] text-xs text-gray-600 dark:text-gray-300">
                  {req.message}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                  {req.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAction(req.id, "declined")}
                        className="btn-outline !py-1.5 !px-3 text-xs"
                      >
                        <XCircle size={14} className="text-red-500" />
                        <span>Decline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(req.id, "accepted")}
                        className="btn-primary !py-1.5 !px-4 text-xs"
                      >
                        <CheckCircle2 size={14} />
                        <span>Accept</span>
                      </button>
                    </>
                  ) : (
                    <span
                      className={`text-xs font-bold capitalize ${
                        req.status === "accepted" ? "text-emerald-500" : "text-gray-400"
                      }`}
                    >
                      Status: {req.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {INITIAL_SENT.map((req) => (
            <div key={req.id} className="card !p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                    Application to {req.projectTitle}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Role: {req.roleApplied}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                  Pending Review
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 pt-1">{req.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

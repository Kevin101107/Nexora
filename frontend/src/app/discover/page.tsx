"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { PublicUserProfile } from "@/lib/types";
import {
  Search,
  Compass,
  Code2,
  Users,
  Send,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";

const ROLES = [
  "All Roles",
  "Frontend",
  "Backend",
  "Full-Stack",
  "Mobile",
  "UI/UX",
  "AI / ML",
  "DevOps",
];

export default function DiscoverPage() {
  const [builders, setBuilders] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Connect Modal state
  const [targetBuilder, setTargetBuilder] = useState<PublicUserProfile | null>(null);
  const [connectMessage, setConnectMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestedUserIds, setRequestedUserIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function loadBuilders() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }
      const api = createApiClient(session?.access_token || "");

      try {
        let path = "/users?";
        if (selectedRole !== "All Roles") path += `role=${encodeURIComponent(selectedRole)}&`;
        if (query.trim()) path += `q=${encodeURIComponent(query.trim())}&`;
        const res = await api.get<PublicUserProfile[]>(path);
        setBuilders(res || []);
      } catch (err: any) {
        setBuilders([]);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      loadBuilders();
    }, 200);

    return () => clearTimeout(timer);
  }, [query, selectedRole]);

  async function handleConnectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetBuilder) return;
    setSendingRequest(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast("Please log in to send teammate requests", "error");
        setSendingRequest(false);
        return;
      }
      const api = createApiClient(session.access_token);
      await api.post("/requests", {
        receiver_id: targetBuilder.id,
        message: connectMessage.trim() || null,
      });

      setRequestedUserIds((prev) => [...prev, targetBuilder.id]);
      toast(`Connection request sent to ${targetBuilder.display_name || targetBuilder.username}!`);
      setTargetBuilder(null);
      setConnectMessage("");
    } catch (err: any) {
      toast(err?.message || "Failed to send request", "error");
    } finally {
      setSendingRequest(false);
    }
  }

  const availabilityLabels: Record<string, { label: string; color: string }> = {
    open: { label: "Open to Collaborations", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
    looking_for_hackathon: { label: "Looking for Hackathon Squad", color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
    looking_for_project: { label: "Looking for Side Project", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
    busy: { label: "Busy", color: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Compass size={18} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Discover Teammates
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Find student builders, developers, and designers with complementary technical skills.
        </p>
      </div>

      {/* ── Filters & Search ──────────────────────────────────── */}
      <div className="card !p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, username, skill (e.g. React, Go, Figma), or topic..."
            className="input-field pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
                selectedRole === r
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Builders List ─────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : builders.length === 0 ? (
        <div className="card !p-12 text-center space-y-2">
          <p className="text-sm font-bold text-gray-900 dark:text-white">No builders found</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Try adjusting your search criteria or selecting &apos;All Roles&apos;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builders.map((builder) => {
            const displayName = builder.display_name || builder.username || "Builder";
            const initial = displayName.charAt(0).toUpperCase();
            const isSelf = currentUserId === builder.id;
            const isRequested = requestedUserIds.includes(builder.id);
            const avail =
              availabilityLabels[builder.availability] || availabilityLabels.open;

            return (
              <div
                key={builder.id}
                className="card !p-5 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary font-black text-base flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-base text-gray-900 dark:text-white">
                            {displayName}
                          </h3>
                        </div>
                        {builder.username && (
                          <Link
                            href={`/profile/${builder.username}`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            @{builder.username}
                          </Link>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${avail.color}`}
                    >
                      {avail.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium mb-3 line-clamp-2">
                    {builder.headline || "Student Builder on Nexora"}
                  </p>

                  {/* Roles */}
                  {builder.roles && builder.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {builder.roles.map((role) => (
                        <span
                          key={role}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skills tags */}
                  {builder.skills && builder.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {builder.skills.slice(0, 6).map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                  {builder.username ? (
                    <Link
                      href={`/profile/${builder.username}`}
                      className="text-xs font-semibold text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>View Profile</span>
                      <ExternalLink size={12} />
                    </Link>
                  ) : (
                    <span />
                  )}

                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => setTargetBuilder(builder)}
                      disabled={isRequested}
                      className={`btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 ${
                        isRequested ? "!bg-emerald-600 !opacity-100 cursor-default" : ""
                      }`}
                    >
                      {isRequested ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Requested</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Modal */}
      {targetBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card !p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Invite {targetBuilder.display_name || targetBuilder.username} to Connect
              </h3>
              <button
                type="button"
                onClick={() => setTargetBuilder(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Send a personalized invitation to collaborate on projects or hackathons.
            </p>

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="label">Note (Optional)</label>
                <textarea
                  value={connectMessage}
                  onChange={(e) => setConnectMessage(e.target.value)}
                  rows={3}
                  className="input-field text-xs"
                  placeholder="e.g. Hi! Looking for a teammate for the upcoming hackathon. Saw your stack and would love to build together..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetBuilder(null)}
                  className="btn-outline text-xs !py-1.5 !px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingRequest}
                  className="btn-primary text-xs !py-1.5 !px-4"
                >
                  {sendingRequest ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Send size={13} />
                      Send Invitation
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

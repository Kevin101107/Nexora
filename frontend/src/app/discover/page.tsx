"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { PublicUserProfile, UserRoleRecommendation } from "@/lib/types";
import MatchScoreBadge from "@/components/MatchScoreBadge";
import {
  Search,
  Compass,
  Users,
  Send,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink,
  Sparkles,
  FolderGit2,
  Clock,
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
  const [activeTab, setActiveTab] = useState<"recommended" | "builders">("recommended");
  const [recommendations, setRecommendations] = useState<UserRoleRecommendation[]>([]);
  const [builders, setBuilders] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Connect Modal state for builders
  const [targetBuilder, setTargetBuilder] = useState<PublicUserProfile | null>(null);
  const [connectMessage, setConnectMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestedUserIds, setRequestedUserIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
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
        // If session exists, fetch recommended roles for user
        if (session) {
          const recs = await api.get<UserRoleRecommendation[]>("/matches/me/roles?limit=25").catch(() => []);
          setRecommendations(recs || []);
        } else {
          setActiveTab("builders");
        }

        // Fetch builders with filters
        let path = "/users?";
        if (selectedRole !== "All Roles") path += `role=${encodeURIComponent(selectedRole)}&`;
        if (query.trim()) path += `q=${encodeURIComponent(query.trim())}&`;
        const usersList = await api.get<PublicUserProfile[]>(path);
        setBuilders(usersList || []);
      } catch (err: any) {
        // Fallbacks
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      loadData();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Compass size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Discover & Compatibility
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Find compatible project roles and student builders with explainable Match Score V1.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/[0.05] rounded-2xl w-fit text-xs font-bold self-start sm:self-auto">
          {currentUserId && (
            <button
              onClick={() => setActiveTab("recommended")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "recommended"
                  ? "bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Sparkles size={13} className="text-primary" />
              <span>Recommended Roles ({recommendations.length})</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab("builders")}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "builders"
                ? "bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Users size={13} />
            <span>All Builders ({builders.length})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "recommended" ? (
        /* ── Tab 1: Recommended Roles for Authenticated User ── */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-transparent to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Sparkles size={15} className="text-primary" />
                <span>Deterministic Match Score V1</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Roles are ranked based on skill overlap (60%), role alignment (25%), and availability compatibility (15%).
              </p>
            </div>
            <Link
              href="/profile/edit"
              className="btn-outline text-xs !py-1.5 !px-3 self-start sm:self-auto shrink-0"
            >
              Update Skills for Better Matches
            </Link>
          </div>

          {recommendations.length === 0 ? (
            <div className="card !p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                No matching open roles right now
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                There are currently no recruiting projects with open roles matching your skills, or you may need to add skills to your profile.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Link href="/profile/edit" className="btn-primary text-xs !py-2 !px-4">
                  Add Skills to Profile
                </Link>
                <Link href="/projects" className="btn-outline text-xs !py-2 !px-4">
                  Browse All Projects
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => {
                const slotsLeft = rec.role.slots - rec.role.filled_slots;

                return (
                  <div
                    key={rec.role.id}
                    className="card !p-5 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                            {rec.project.category.replace("_", " ")}
                          </span>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white mt-1">
                            {rec.role.role_name}
                          </h3>
                          <Link
                            href={`/projects/${rec.project.id}`}
                            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <span>Project: {rec.project.title}</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                            <Clock size={12} /> {slotsLeft} {slotsLeft === 1 ? "spot" : "spots"} open
                          </span>
                        </div>
                      </div>

                      {/* Explainable Match Badge */}
                      <MatchScoreBadge match={rec.match} showDetails={false} />

                      {rec.role.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {rec.role.description}
                        </p>
                      )}

                      {/* Role required skills */}
                      {rec.role.required_skills && rec.role.required_skills.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Required Skills:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {rec.role.required_skills.map((s) => (
                              <span
                                key={s}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {rec.project.members_count} team {rec.project.members_count === 1 ? "member" : "members"}
                      </span>

                      <Link
                        href={`/projects/${rec.project.id}`}
                        className="btn-primary !py-1.5 !px-3.5 text-xs flex items-center gap-1"
                      >
                        <Send size={13} />
                        <span>View & Apply</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Tab 2: All Student Builders ── */
        <div className="space-y-5">
          {/* Filters & Search */}
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

          {builders.length === 0 ? (
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
        </div>
      )}

      {/* Connect Modal for Builder */}
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

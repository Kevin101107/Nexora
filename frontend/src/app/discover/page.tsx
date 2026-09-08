"use client";
const session = true;

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  PublicUserProfile,
  UserRoleRecommendation,
  ProjectListItem,
  MatchScoreResult,
  UserRoleMatchResponse,
} from "@/lib/types";
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
  Briefcase,
  UserPlus,
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

const AVAILABILITY_FILTERS = [
  { key: "all", label: "All Statuses" },
  { key: "open", label: "Open" },
  { key: "looking_for_hackathon", label: "Hackathon Squad" },
  { key: "looking_for_project", label: "Side Project" },
  { key: "busy", label: "Busy" },
];

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<"recommended" | "builders">("recommended");
  const [recommendations, setRecommendations] = useState<UserRoleRecommendation[]>([]);
  const [builders, setBuilders] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // My owned projects for inviting to roles
  const [myOwnedProjects, setMyOwnedProjects] = useState<ProjectListItem[]>([]);

  // Connect / Invite Modal state for builders
  const [targetBuilder, setTargetBuilder] = useState<PublicUserProfile | null>(null);
  const [inviteType, setInviteType] = useState<"general" | "project">("general");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [matchPreview, setMatchPreview] = useState<MatchScoreResult | null>(null);
  const [loadingMatchPreview, setLoadingMatchPreview] = useState(false);
  const [connectMessage, setConnectMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestedUserIds, setRequestedUserIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      if (session) {
        setCurrentUserId(DEVELOPMENT_USER_ID);
      }
      const api = createApiClient(DEVELOPMENT_USER_ID);

      try {
        // Fetch recommended roles for the development user
        if (session) {
          const [recs, projs] = await Promise.all([
            api.get<UserRoleRecommendation[]>("/matches/me/roles?limit=25").catch(() => []),
            api.get<ProjectListItem[]>("/projects").catch(() => []),
          ]);
          setRecommendations(recs || []);
          setMyOwnedProjects((projs || []).filter((p) => p.owner_id === DEVELOPMENT_USER_ID));
        } else {
          setActiveTab("builders");
        }

        // Fetch builders with filters
        let path = "/users?";
        if (selectedRole !== "All Roles") path += `role=${encodeURIComponent(selectedRole)}&`;
        if (selectedAvailability !== "all") path += `availability=${encodeURIComponent(selectedAvailability)}&`;
        if (query.trim()) path += `q=${encodeURIComponent(query.trim())}&`;
        const usersList = await api.get<PublicUserProfile[]>(path).catch(() => []);
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
  }, [query, selectedRole, selectedAvailability]);

  async function fetchMatchPreview(userId: string, roleId: string) {
    setLoadingMatchPreview(true);
    try {
      const api = createApiClient(DEVELOPMENT_USER_ID);
      const res = await api.get<UserRoleMatchResponse>(`/matches/users/${userId}/roles/${roleId}`);
      if (res && res.match) {
        setMatchPreview(res.match);
      } else {
        setMatchPreview(null);
      }
    } catch {
      setMatchPreview(null);
    } finally {
      setLoadingMatchPreview(false);
    }
  }

  function handleOpenConnectModal(builder: PublicUserProfile) {
    setTargetBuilder(builder);
    setConnectMessage("");
    setMatchPreview(null);

    // If user owns projects with open roles, default to project invitation
    const projectsWithRoles = myOwnedProjects.filter(
      (p) => p.roles && p.roles.some((r) => r.status === "open" && r.filled_slots < r.slots)
    );

    if (projectsWithRoles.length > 0) {
      setInviteType("project");
      const firstProj = projectsWithRoles[0];
      setSelectedProjectId(firstProj.id);
      const openRoles = firstProj.roles.filter((r) => r.status === "open" && r.filled_slots < r.slots);
      if (openRoles.length > 0) {
        setSelectedRoleId(openRoles[0].id);
        fetchMatchPreview(builder.id, openRoles[0].id);
      } else {
        setSelectedRoleId("");
      }
    } else {
      setInviteType("general");
      setSelectedProjectId("");
      setSelectedRoleId("");
    }
  }

  function handleProjectChange(projId: string) {
    setSelectedProjectId(projId);
    const proj = myOwnedProjects.find((p) => p.id === projId);
    const openRoles = proj?.roles.filter((r) => r.status === "open" && r.filled_slots < r.slots) || [];
    if (openRoles.length > 0 && targetBuilder) {
      setSelectedRoleId(openRoles[0].id);
      fetchMatchPreview(targetBuilder.id, openRoles[0].id);
    } else {
      setSelectedRoleId("");
      setMatchPreview(null);
    }
  }

  function handleRoleChange(roleId: string) {
    setSelectedRoleId(roleId);
    if (targetBuilder && roleId) {
      fetchMatchPreview(targetBuilder.id, roleId);
    } else {
      setMatchPreview(null);
    }
  }

  async function handleConnectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetBuilder) return;
    setSendingRequest(true);
    try {
      if (!session) {
        toast("Please log in to send teammate requests", "error");
        setSendingRequest(false);
        return;
      }
      const api = createApiClient(DEVELOPMENT_USER_ID);

      const payload: any = {
        receiver_id: targetBuilder.id,
        message: connectMessage.trim() || null,
      };

      if (inviteType === "project" && selectedProjectId) {
        payload.project_id = selectedProjectId;
        if (selectedRoleId) {
          payload.role_id = selectedRoleId;
        }
      }

      await api.post("/requests", payload);

      setRequestedUserIds((prev) => [...prev, targetBuilder.id]);
      toast(`Invitation sent to ${targetBuilder.display_name || targetBuilder.username}!`);
      setTargetBuilder(null);
      setConnectMessage("");
      setMatchPreview(null);
      setSelectedProjectId("");
      setSelectedRoleId("");
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
        /* ── Tab 1: Recommended Roles for Development User ── */
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
              <span className="text-[11px] font-bold text-gray-400 shrink-0">Role:</span>
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

            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs pt-1 border-t border-gray-100 dark:border-white/[0.04]">
              <span className="text-[11px] font-bold text-gray-400 shrink-0">Availability:</span>
              {AVAILABILITY_FILTERS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setSelectedAvailability(a.key)}
                  className={`px-3 py-1 rounded-xl font-semibold transition-colors shrink-0 ${
                    selectedAvailability === a.key
                      ? "bg-primary/90 text-white"
                      : "bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
                  }`}
                >
                  {a.label}
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
                          onClick={() => handleOpenConnectModal(builder)}
                          disabled={isRequested}
                          className={`btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 ${
                            isRequested ? "!bg-emerald-600 !opacity-100 cursor-default" : ""
                          }`}
                        >
                          {isRequested ? (
                            <>
                              <CheckCircle2 size={13} />
                              <span>Invited</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={13} />
                              <span>Invite / Connect</span>
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

      {/* Connect / Invite Modal for Builder */}
      {targetBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card !p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.06]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Invite {targetBuilder.display_name || targetBuilder.username}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Collaborate on your squad or connect for future projects.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTargetBuilder(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Invite Type Switcher if user has projects */}
            {myOwnedProjects.length > 0 && (
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/[0.05] rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setInviteType("project")}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    inviteType === "project"
                      ? "bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <FolderGit2 size={13} className="text-primary" />
                  <span>Invite to Project Squad</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInviteType("general");
                    setMatchPreview(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    inviteType === "general"
                      ? "bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Users size={13} />
                  <span>Direct Connection</span>
                </button>
              </div>
            )}

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              {inviteType === "project" && myOwnedProjects.length > 0 && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                  <div>
                    <label className="label">Select Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      className="input-field text-xs"
                    >
                      {myOwnedProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.open_roles_count} open {p.open_roles_count === 1 ? "role" : "roles"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const currentProj = myOwnedProjects.find((p) => p.id === selectedProjectId);
                    const openRoles =
                      currentProj?.roles.filter((r) => r.status === "open" && r.filled_slots < r.slots) || [];

                    if (openRoles.length === 0) {
                      return (
                        <p className="text-xs text-amber-500">
                          This project has no open roles. You can still send a general project invite.
                        </p>
                      );
                    }

                    return (
                      <div>
                        <label className="label">Target Role</label>
                        <select
                          value={selectedRoleId}
                          onChange={(e) => handleRoleChange(e.target.value)}
                          className="input-field text-xs"
                        >
                          <option value="">General Member (No specific role)</option>
                          {openRoles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.role_name} ({r.slots - r.filled_slots} spots left)
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  {/* Match Preview */}
                  {loadingMatchPreview ? (
                    <div className="py-2 flex items-center justify-center gap-2 text-xs text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Checking role match score...</span>
                    </div>
                  ) : matchPreview ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Compatibility Preview:
                      </p>
                      <MatchScoreBadge match={matchPreview} showDetails={false} />
                    </div>
                  ) : null}
                </div>
              )}

              <div>
                <label className="label">Personalized Note</label>
                <textarea
                  value={connectMessage}
                  onChange={(e) => setConnectMessage(e.target.value)}
                  rows={3}
                  className="input-field text-xs"
                  placeholder={
                    inviteType === "project"
                      ? "Tell the builder why they'd be a great fit for your squad..."
                      : "Introduce yourself and what kind of projects or hackathons you want to build together..."
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
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

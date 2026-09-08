"use client";
const session = true;

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  PublicUserProfile,
  ProjectListItem,
  MatchScoreResult,
  UserRoleMatchResponse,
  ContributionProfileResponse,
  ContributionBadge,
  ProjectContribution,
  RoleContribution,
  RecentContribution,
} from "@/lib/types";
import MatchScoreBadge from "@/components/MatchScoreBadge";
import Dialog from "@/components/ui/Dialog";
import { LoadingState, ErrorState } from "@/components/ui/DataStates";
import {
  User,
  Loader2,
  ArrowLeft,
  Github,
  Linkedin,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  FolderGit2,
  Users,
  Award,
  Trophy,
  Flame,
  Layers,
  Lock,
  Calendar,
  CheckSquare,
  Target,
  ExternalLink,
} from "lucide-react";

export default function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const username = params.username;
  const { toast } = useToast();

  const [contributionData, setContributionData] = useState<ContributionProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectMessage, setConnectMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Projects owned by viewer
  const [myOwnedProjects, setMyOwnedProjects] = useState<ProjectListItem[]>([]);
  const [inviteType, setInviteType] = useState<"general" | "project">("general");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [matchPreview, setMatchPreview] = useState<MatchScoreResult | null>(null);
  const [loadingMatchPreview, setLoadingMatchPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (session) {
      setCurrentUserId(DEVELOPMENT_USER_ID);
    }

    const api = createApiClient(DEVELOPMENT_USER_ID);
    try {
      const [contribRes, projs] = await Promise.all([
        api.get<ContributionProfileResponse>(`/users/${username}/contributions`),
        api.get<ProjectListItem[]>("/projects").catch(() => []),
      ]);
      setContributionData(contribRes);
      const owned = (projs || []).filter((item) => item.owner_id === DEVELOPMENT_USER_ID);
      setMyOwnedProjects(owned);
    } catch (err: any) {
      setContributionData(null);
      const msg = err?.message || "Failed to load profile";
      if (!msg.includes("404") && !msg.toLowerCase().includes("not found")) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

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

  function handleOpenModal() {
    setIsConnectModalOpen(true);
    setConnectMessage("");
    setMatchPreview(null);

    const projectsWithRoles = myOwnedProjects.filter(
      (p) => p.roles && p.roles.some((r) => r.status === "open" && r.filled_slots < r.slots)
    );

    if (projectsWithRoles.length > 0 && contributionData?.user) {
      setInviteType("project");
      const firstProj = projectsWithRoles[0];
      setSelectedProjectId(firstProj.id);
      const openRoles = firstProj.roles.filter((r) => r.status === "open" && r.filled_slots < r.slots);
      if (openRoles.length > 0) {
        setSelectedRoleId(openRoles[0].id);
        fetchMatchPreview(contributionData.user.id, openRoles[0].id);
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
    if (openRoles.length > 0 && contributionData?.user) {
      setSelectedRoleId(openRoles[0].id);
      fetchMatchPreview(contributionData.user.id, openRoles[0].id);
    } else {
      setSelectedRoleId("");
      setMatchPreview(null);
    }
  }

  function handleRoleChange(roleId: string) {
    setSelectedRoleId(roleId);
    if (contributionData?.user && roleId) {
      fetchMatchPreview(contributionData.user.id, roleId);
    } else {
      setMatchPreview(null);
    }
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!contributionData?.user) return;
    setSendingRequest(true);
    try {
      if (!session) {
        toast("Please log in to send teammate requests", "error");
        setSendingRequest(false);
        return;
      }
      const api = createApiClient(DEVELOPMENT_USER_ID);

      const payload: any = {
        receiver_id: contributionData.user.id,
        message: connectMessage.trim() || null,
      };

      if (inviteType === "project" && selectedProjectId) {
        payload.project_id = selectedProjectId;
        if (selectedRoleId) {
          payload.role_id = selectedRoleId;
        }
      }

      await api.post("/requests", payload);
      setRequestSent(true);
      setIsConnectModalOpen(false);
      toast(`Teammate request sent to ${contributionData.user.display_name || contributionData.user.username}!`);
    } catch (err: any) {
      toast(err?.message || "Failed to send request", "error");
    } finally {
      setSendingRequest(false);
    }
  }

  function formatDate(isoString?: string | null) {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  }

  function getBadgeIcon(badgeId: string) {
    switch (badgeId) {
      case "first_project":
        return <FolderGit2 className="w-5 h-5" />;
      case "contributor":
        return <CheckCircle2 className="w-5 h-5" />;
      case "active_contributor":
        return <Flame className="w-5 h-5" />;
      case "project_finisher":
        return <Trophy className="w-5 h-5" />;
      case "multi_project":
        return <Layers className="w-5 h-5" />;
      case "consistent_contributor":
        return <ShieldCheck className="w-5 h-5" />;
      default:
        return <Award className="w-5 h-5" />;
    }
  }

  if (loading) {
    return <LoadingState message="Loading builder profile & contribution history..." />;
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <ErrorState
          title="Failed to Load Profile"
          message={error}
          onRetry={load}
        />
      </div>
    );
  }

  if (!contributionData) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 flex items-center justify-center mx-auto">
          <User size={28} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Builder Not Found</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          We couldn&apos;t find any builder profile matching @{username}.
        </p>
        <div>
          <Link href="/discover" className="btn-primary text-xs !py-2 !px-4 inline-flex items-center">
            Explore All Builders
          </Link>
        </div>
      </div>
    );
  }

  const { user: profile, summary, projects, roles, recent_activity, badges } = contributionData;
  const displayName = profile.display_name || profile.username || "Builder";
  const initial = displayName.charAt(0).toUpperCase();
  const isOwnProfile = currentUserId === profile.id;
  const isNewUser = summary.projects_joined === 0 && summary.tasks_completed === 0;

  const availabilityLabels: Record<string, { label: string; color: string }> = {
    open: { label: "Open to Collaborations", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
    looking_for_hackathon: { label: "Looking for Hackathon Squad", color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
    looking_for_project: { label: "Looking for Side Project", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
    busy: { label: "Currently Busy", color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
  };

  const avail = availabilityLabels[profile.availability || "open"] || availabilityLabels.open;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Discover</span>
        </Link>
      </div>

      {/* Main Builder Identity Card */}
      <div className="card !p-6 sm:!p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 rounded-3xl bg-primary/15 text-primary flex items-center justify-center text-3xl font-black shrink-0 shadow-inner">
            {initial}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                    {displayName}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                    <ShieldCheck size={12} />
                    <span>Verified Nexora Builder</span>
                  </span>
                </div>
                {profile.username && (
                  <p className="text-xs font-semibold text-primary mt-0.5">
                    @{profile.username}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-center sm:self-start">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border ${avail.color}`}
                >
                  {avail.label}
                </span>

                {!isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleOpenModal}
                    disabled={requestSent}
                    className={`btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 ${
                      requestSent ? "!bg-emerald-600 !opacity-100 cursor-default" : ""
                    }`}
                  >
                    {requestSent ? (
                      <>
                        <CheckCircle2 size={13} />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Invite / Connect</span>
                      </>
                    )}
                  </button>
                )}

                {isOwnProfile && (
                  <Link
                    href="/profile/edit"
                    className="btn-outline text-xs !py-1.5 !px-3"
                  >
                    Edit My Profile
                  </Link>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 font-medium">
              {profile.headline || "Student Builder on Nexora"}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Github size={13} /> GitHub Profile
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Linkedin size={13} /> LinkedIn Profile
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              About
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Roles */}
        {profile.roles && profile.roles.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Primary Roles
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.roles.map((r) => (
                <span
                  key={r}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Technical Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Tech Stack & Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span
                  key={s}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.05] text-gray-800 dark:text-gray-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Interests & Domains
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((item) => (
                <span
                  key={item}
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New User Welcome / Motivation Banner */}
      {isNewUser && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Ready for First Collaboration</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
              This builder has joined Nexora and is ready to tackle their first project squad. Verified execution metrics will appear once they start completing tasks.
            </p>
          </div>
          {!isOwnProfile && (
            <button
              type="button"
              onClick={handleOpenModal}
              className="btn-primary text-xs !py-2 !px-4 shrink-0"
            >
              Invite to Squad
            </button>
          )}
        </div>
      )}

      {/* Top 4 Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="card !p-4 sm:!p-5 space-y-1">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Projects</span>
            <FolderGit2 size={16} className="text-primary" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {summary.projects_joined}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {summary.active_projects} active · {summary.completed_projects} completed
          </p>
        </div>

        <div className="card !p-4 sm:!p-5 space-y-1">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tasks Completed</span>
            <CheckSquare size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {summary.tasks_completed}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {summary.task_completion_rate}% completion ({summary.tasks_assigned} assigned)
          </p>
        </div>

        <div className="card !p-4 sm:!p-5 space-y-1">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Milestones</span>
            <Target size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {summary.milestones_contributed}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            Milestones delivered
          </p>
        </div>

        <div className="card !p-4 sm:!p-5 space-y-1">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Roles Held</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {summary.roles_held}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            Distinct squad roles
          </p>
        </div>
      </div>

      {/* Collaboration Badges Section */}
      <div className="card !p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="text-primary w-5 h-5" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Collaboration Badges
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Deterministic, evidence-based badges earned through verified Nexora project execution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {badges.map((b: ContributionBadge) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                b.awarded
                  ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-300/50 dark:border-purple-500/30 text-purple-900 dark:text-purple-100 shadow-xs"
                  : "bg-gray-50/50 dark:bg-white/[0.02] border-gray-200/60 dark:border-white/[0.06] text-gray-400 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`p-2 rounded-lg ${
                    b.awarded
                      ? "bg-primary/15 text-primary"
                      : "bg-gray-200/50 dark:bg-white/5 text-gray-400"
                  }`}
                >
                  {getBadgeIcon(b.id)}
                </div>
                {b.awarded ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Earned
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200/50 dark:bg-white/5 text-gray-400 flex items-center gap-1">
                    <Lock size={10} /> Locked
                  </span>
                )}
              </div>

              <div>
                <h3 className={`text-xs font-bold ${b.awarded ? "text-gray-900 dark:text-white" : "text-gray-500"}`}>
                  {b.name}
                </h3>
                <p className="text-[11px] leading-relaxed mt-1 text-gray-500 dark:text-gray-400">
                  {b.description}
                </p>
              </div>

              <div className="text-[10px] text-gray-400 font-mono border-t border-gray-100 dark:border-white/[0.04] pt-2">
                Criteria: {b.criteria}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Contributions Breakdown */}
      <div className="card !p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FolderGit2 className="text-primary w-5 h-5" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Project History
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Public projects and squad contributions.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300">
            {projects.length} {projects.length === 1 ? "Project" : "Projects"}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08] space-y-2">
            <FolderGit2 className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
              No public projects yet
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              This builder has not participated in any public projects yet. Verified project achievements will show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj: ProjectContribution) => (
              <div
                key={proj.project_id}
                className="p-4 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <Link
                      href={`/projects/${proj.project_id}`}
                      className="text-sm font-bold text-gray-900 dark:text-white hover:text-primary transition-colors line-clamp-1 inline-flex items-center gap-1"
                    >
                      <span>{proj.project_title}</span>
                      <ExternalLink size={12} className="shrink-0 text-gray-400" />
                    </Link>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        proj.project_status === "completed"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {proj.project_status}
                    </span>
                  </div>

                  {proj.role_name && (
                    <p className="text-xs font-semibold text-primary mb-2">
                      Role: {proj.role_name}
                    </p>
                  )}

                  {/* Task progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      <span>Tasks: {proj.tasks_completed} / {proj.tasks_assigned}</span>
                      <span>{proj.completion_rate}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min(100, proj.completion_rate)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100 dark:border-white/[0.04]">
                  <span>Milestones: {proj.milestones_contributed}</span>
                  {proj.joined_at && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> Joined {formatDate(proj.joined_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role History Section */}
      {roles.length > 0 && (
        <div className="card !p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="text-primary w-5 h-5" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Role History
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Positions held across verified Nexora teams.
            </p>
          </div>

          <div className="space-y-2">
            {roles.map((r: RoleContribution, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <User size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      {r.role_name}
                    </h3>
                    <Link
                      href={`/projects/${r.project_id}`}
                      className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-primary transition-colors inline-flex items-center gap-1"
                    >
                      <span>{r.project_title}</span>
                      <ExternalLink size={10} />
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span
                    className={`px-2 py-0.5 rounded-full uppercase text-[10px] font-semibold ${
                      r.membership_status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-gray-500/10 text-gray-400"
                    }`}
                  >
                    {r.membership_status}
                  </span>
                  {r.joined_at && (
                    <span>Since {formatDate(r.joined_at)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Stream */}
      <div className="card !p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="text-primary w-5 h-5" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Recent Contributions
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Verified activity log in public Nexora project workspaces.
          </p>
        </div>

        {recent_activity.length === 0 ? (
          <div className="text-center py-8 px-4 text-gray-400 text-xs">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recent_activity.map((act: RecentContribution) => (
              <div
                key={act.id}
                className="p-3 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06] flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {act.summary}
                    </p>
                    <Link
                      href={`/projects/${act.project_id}`}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {act.project_title}
                    </Link>
                  </div>
                </div>

                <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">
                  {formatDate(act.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect / Invite Modal */}
      <Dialog
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        title={`Invite ${displayName}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Collaborate on your squad or connect for future projects.
          </p>

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

          <form onSubmit={handleSendRequest} className="space-y-4">
            {inviteType === "project" && myOwnedProjects.length > 0 && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                <div>
                  <label htmlFor="profile-project-select" className="label">
                    Select Project
                  </label>
                  <select
                    id="profile-project-select"
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
                      <label htmlFor="profile-role-select" className="label">
                        Target Role
                      </label>
                      <select
                        id="profile-role-select"
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
              <label htmlFor="profile-connect-message" className="label">
                Personalized Note
              </label>
              <textarea
                id="profile-connect-message"
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
                onClick={() => setIsConnectModalOpen(false)}
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
      </Dialog>
    </div>
  );
}

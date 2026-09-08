"use client";
const session = true;

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import {
  UserProfileRead,
  ContributionProfileResponse,
  ContributionBadge,
  ProjectContribution,
  RoleContribution,
  RecentContribution,
} from "@/lib/types";
import {
  User,
  Loader2,
  Edit3,
  ExternalLink,
  Mail,
  Github,
  Linkedin,
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
  CheckCircle2,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileRead | null>(null);
  const [contributionData, setContributionData] = useState<ContributionProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      if (session) {
        const api = createApiClient(DEVELOPMENT_USER_ID);
        try {
          const [p, c] = await Promise.all([
            api.get<UserProfileRead>("/users/me").catch(() => null),
            api.get<ContributionProfileResponse>("/users/me/contributions").catch(() => null),
          ]);
          if (p) setProfile(p);
          if (c) setContributionData(c);
        } catch {
          // Ignore
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

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
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.display_name || "Builder";
  const username = profile?.username;
  const initial = displayName.charAt(0).toUpperCase();

  const availabilityLabels: Record<string, { label: string; color: string }> = {
    open: { label: "Open to Collaborations", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
    looking_for_hackathon: { label: "Looking for Hackathon Squad", color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
    looking_for_project: { label: "Looking for Side Project", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
    busy: { label: "Currently Busy", color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
  };

  const avail = availabilityLabels[profile?.availability || "open"] || availabilityLabels.open;
  const summary = contributionData?.summary;
  const badges = contributionData?.badges || [];
  const projects = contributionData?.projects || [];
  const roles = contributionData?.roles || [];
  const recent_activity = contributionData?.recent_activity || [];
  const isNewUser = summary ? summary.projects_joined === 0 && summary.tasks_completed === 0 : true;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            My Builder Profile
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            How other student builders and project owners see your verified collaboration history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {username && (
            <Link
              href={`/profile/${username}`}
              className="btn-outline text-xs !py-2 !px-3 flex items-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Public View</span>
            </Link>
          )}
          <Link
            href="/profile/edit"
            className="btn-primary text-xs !py-2 !px-3.5 flex items-center gap-1.5"
          >
            <Edit3 size={13} />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="card !p-6 sm:!p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 rounded-3xl bg-primary/15 text-primary flex items-center justify-center text-3xl font-black shrink-0 shadow-inner">
            {initial}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {displayName}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                    <ShieldCheck size={12} />
                    <span>Verified Nexora Builder</span>
                  </span>
                </div>
                {username && (
                  <p className="text-xs font-semibold text-primary mt-0.5">
                    @{username}
                  </p>
                )}
              </div>

              <span
                className={`self-center sm:self-start text-xs font-semibold px-3 py-1 rounded-full border ${avail.color}`}
              >
                {avail.label}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 font-medium">
              {profile?.headline || "No headline set yet. Tell prospective teammates what you build!"}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Mail size={13} /> {profile?.email} (private)
              </span>
              {profile?.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Github size={13} /> GitHub
                </a>
              )}
              {profile?.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Linkedin size={13} /> LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              About & Background
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Roles */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Primary Roles
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile?.roles && profile.roles.length > 0 ? (
              profile.roles.map((r) => (
                <span
                  key={r}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20"
                >
                  {r}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">No roles selected yet.</span>
            )}
          </div>
        </div>

        {/* Technical Skills */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Technical Stack & Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile?.skills && profile.skills.length > 0 ? (
              profile.skills.map((s) => (
                <span
                  key={s}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.05] text-gray-800 dark:text-gray-200"
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">No skills listed yet.</span>
            )}
          </div>
        </div>

        {/* Interests */}
        {profile?.interests && profile.interests.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Interests & Domains
            </h3>
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

      {/* New User Motivating Notice */}
      {isNewUser && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Kickstart Your Collaboration History</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
              Join or create projects, get assigned to roles, and complete workspace tasks to earn verified reputation badges and build your evidence-backed builder profile.
            </p>
          </div>
          <Link href="/projects" className="btn-primary text-xs !py-2 !px-4 shrink-0">
            Explore Projects
          </Link>
        </div>
      )}

      {/* Summary Metrics Bar */}
      {summary && (
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
      )}

      {/* Collaboration Badges Section */}
      {badges.length > 0 && (
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
      )}

      {/* Project History */}
      {projects.length > 0 && (
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
                Your contributions across public projects.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300">
              {projects.length} {projects.length === 1 ? "Project" : "Projects"}
            </span>
          </div>

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
        </div>
      )}

      {/* Role History */}
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
              Positions held across verified squads.
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
      {recent_activity.length > 0 && (
        <div className="card !p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="text-primary w-5 h-5" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Recent Activity
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Your latest verified contributions.
            </p>
          </div>

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
        </div>
      )}
    </div>
  );
}

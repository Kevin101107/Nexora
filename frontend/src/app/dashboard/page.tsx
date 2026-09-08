"use client";
const session = true;

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { UserProfileRead, ProjectListItem, TeammateRequest, UserTeam, UserRoleRecommendation } from "@/lib/types";
import MatchScoreBadge from "@/components/MatchScoreBadge";
import {
  Users,
  FolderGit2,
  Inbox,
  ArrowRight,
  Plus,
  Compass,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfileRead | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [myTeams, setMyTeams] = useState<UserTeam[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [recommendedRoles, setRecommendedRoles] = useState<UserRoleRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {

      if (!session) {
        setLoading(false);
        return;
      }

      const api = createApiClient(DEVELOPMENT_USER_ID);
      try {
        const [prof, projs, teams, reqs, apps, recs] = await Promise.all([
          api.get<UserProfileRead>("/users/me").catch(() => null),
          api.get<ProjectListItem[]>("/projects").catch(() => []),
          api.get<UserTeam[]>("/teams/me").catch(() => []),
          api.get<TeammateRequest[]>("/requests?direction=received").catch(() => []),
          api.get<any[]>("/applications/me").catch(() => []),
          api.get<UserRoleRecommendation[]>("/matches/me/roles?limit=4").catch(() => []),
        ]);

        if (prof) setProfile(prof);
        if (projs) setProjects(projs);
        if (teams) setMyTeams(teams);
        if (recs) setRecommendedRoles(recs);

        const pendingReqs = (reqs || []).filter((r) => r.status === "pending").length;
        setPendingRequestsCount(pendingReqs);
      } catch (err: any) {
        // Fallbacks
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const displayName = profile?.display_name || profile?.username || "Builder";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* ── Welcome Header ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Match Score V1 Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Welcome back, {displayName} 👋
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed">
              Find compatible teammates, recruit members for your projects, and form squads for upcoming hackathons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/discover"
              className="btn-primary text-xs sm:text-sm !py-2.5 !px-4 flex items-center gap-1.5"
            >
              <Compass size={16} />
              <span>Find Teammates</span>
            </Link>
            <Link
              href="/projects/new"
              className="btn-outline text-xs sm:text-sm !py-2.5 !px-4 flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>Post a Project</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Quick Stats / Overview ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card !p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Active Squads
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {loading ? "-" : myTeams.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Teams you belong to</p>
        </div>

        <div className="card !p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recruiting Projects
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FolderGit2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {loading ? "-" : projects.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Open on platform</p>
        </div>

        <div className="card !p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Pending Requests
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Inbox size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {loading ? "-" : pendingRequestsCount}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Incoming invitations</p>
        </div>

        <div className="card !p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Profile Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 capitalize truncate">
            {profile?.availability || "Active"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <Link href="/profile/edit" className="hover:underline text-primary">
              Update status →
            </Link>
          </p>
        </div>
      </div>

      {/* ── Active Squads Spotlight ───────────────────────────── */}
      {myTeams.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Active Squads</h2>
            <Link
              href="/teams"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myTeams.slice(0, 2).map((team) => (
              <div key={team.id} className="card !p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {team.my_member_role === "Owner" ? "Team Lead" : "Member"}
                  </span>
                  <span className="text-xs text-gray-400">{team.members_count} members</span>
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  {team.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {team.description}
                </p>
                <div className="pt-2 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-end">
                  <Link
                    href={`/projects/${team.id}`}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Open squad room</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommended Opportunities (Match Score V1) ─────────── */}
      {recommendedRoles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Recommended Opportunities
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  <Sparkles size={10} /> Deterministic Fit
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Open project roles matched to your skills, availability, and target roles
              </p>
            </div>
            <Link
              href="/discover?tab=recommended"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedRoles.slice(0, 4).map((rec) => (
              <div
                key={rec.role.id}
                className="card !p-5 space-y-3 hover:border-primary/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {rec.project.category.replace("_", " ")}
                      </span>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">
                        {rec.role.role_name}
                      </h3>
                      <Link
                        href={`/projects/${rec.project.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {rec.project.title}
                      </Link>
                    </div>
                  </div>

                  <MatchScoreBadge match={rec.match} />

                  {rec.role.required_skills && rec.role.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {rec.role.required_skills.map((skill) => {
                        const isMatched = rec.match.matched_skills.some(
                          (ms) => ms.toLowerCase() === skill.toLowerCase()
                        );
                        return (
                          <span
                            key={skill}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                              isMatched
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                : "bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {skill}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Squad: {rec.project.members_count} members
                  </span>
                  <Link
                    href={`/projects/${rec.project.id}`}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View Role & Apply</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recruiting Projects ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Projects Recruiting Teammates
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Student projects and hackathon squads with open spots
            </p>
          </div>
          <Link
            href="/projects"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Explore all</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card !p-8 text-center space-y-2">
            <p className="text-xs text-gray-400">No recruiting projects yet.</p>
            <Link href="/projects/new" className="text-xs font-bold text-primary hover:underline">
              Create the first project →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map((project) => (
              <div
                key={project.id}
                className="card !p-5 hover:border-primary/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
                      {project.category.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} /> {project.open_roles_count} spots open
                    </span>
                  </div>

                  <Link href={`/projects/${project.id}`}>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>

                  {project.roles && project.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {project.roles.map((r) => (
                        <span
                          key={r.id}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium"
                        >
                          {r.role_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Squad: {project.members_count} members
                  </span>
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { UserTeam } from "@/lib/types";
import {
  Users,
  Plus,
  ArrowRight,
  Clock,
  Loader2,
  ExternalLink,
  ShieldCheck,
  FolderGit2,
} from "lucide-react";

export default function TeamsPage() {
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadTeams() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const api = createApiClient(session.access_token);
      try {
        const res = await api.get<UserTeam[]>("/teams/me");
        setTeams(res || []);
      } catch (err: any) {
        setTeams([]);
      } finally {
        setLoading(false);
      }
    }
    loadTeams();
  }, []);

  const categoryLabels: Record<string, string> = {
    hackathon: "Hackathon Squad",
    side_project: "Side Project",
    research: "Research / Capstone",
    startup: "Startup Venture",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Users size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Teams & Squads
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Manage your active project rosters, hackathon teams, and squad members.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="btn-primary text-xs sm:text-sm !py-2 !px-4 self-start sm:self-auto flex items-center gap-1.5"
        >
          <Plus size={16} />
          <span>Create New Team</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <div className="card !p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 flex items-center justify-center mx-auto">
            <Users size={24} />
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            You haven&apos;t joined any squads yet
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Create your own project team or apply to open roles on existing student projects.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/projects/new" className="btn-primary text-xs !py-2 !px-4">
              Post a Project Team
            </Link>
            <Link href="/projects" className="btn-outline text-xs !py-2 !px-4">
              Browse Recruiting Projects
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="card !p-6 space-y-5 border-primary/20 bg-gradient-to-br from-white/90 to-primary/[0.03] dark:from-[#16162a] dark:to-primary/[0.05]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      {categoryLabels[team.category] || team.category}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{team.status}</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    {team.title}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {team.description}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {team.my_member_role === "Owner" ? "Team Lead" : "Squad Member"}
                  </span>
                  <Link
                    href={`/projects/${team.id}`}
                    className="btn-outline text-xs !py-1.5 !px-3 flex items-center gap-1"
                  >
                    <span>Manage Squad</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Member Roster */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                  Roster ({team.members_count} Members)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {team.members.map((m) => {
                    const memberName = m.user?.display_name || m.user?.username || "Builder";
                    const initial = memberName.charAt(0).toUpperCase();
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04] flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {memberName}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {m.role_name || (m.member_role === "Owner" ? "Founder" : "Member")}
                          </p>
                        </div>
                        {m.user?.username && (
                          <Link
                            href={`/profile/${m.user.username}`}
                            className="text-gray-400 hover:text-primary transition-colors shrink-0"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

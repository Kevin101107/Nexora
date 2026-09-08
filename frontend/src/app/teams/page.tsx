"use client";

import Link from "next/link";
import { Users, Plus, Shield, CheckCircle2, ArrowRight, Clock, Award } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function TeamsPage() {
  const { toast } = useToast();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
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
            Manage your project rosters, hackathon teams, and collaborative workspaces.
          </p>
        </div>

        <button
          type="button"
          onClick={() => toast("Team creation wizard will launch in Phase 2!")}
          className="btn-primary text-xs sm:text-sm !py-2 !px-4 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Create New Team</span>
        </button>
      </div>

      {/* Current Team Spotlight */}
      <div className="card !p-6 space-y-5 border-primary/20 bg-gradient-to-br from-white/90 to-primary/[0.03] dark:from-[#16162a] dark:to-primary/[0.05]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                Active Squad
              </span>
              <span className="text-xs text-gray-400">Fall Hackathon 2026</span>
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">SyntaxSquad</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Project: Campus Pulse Radar • Target: 36-hour hackathon submission
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              3/4 Members
            </span>
          </div>
        </div>

        {/* Member Roster */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                You
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Team Lead</p>
                <p className="text-[10px] text-gray-400">Full-Stack / React</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-primary">Team Founder</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 font-bold flex items-center justify-center text-xs">
                AR
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Aarav Rao</p>
                <p className="text-[10px] text-gray-400">Backend / Go</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-gray-500">Confirmed Member</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 font-bold flex items-center justify-center text-xs">
                SK
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Sneha Kapoor</p>
                <p className="text-[10px] text-gray-400">UI/UX Designer</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-gray-500">Confirmed Member</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
            <Clock size={16} />
            <span>Open Spot: <strong>Mobile / React Native Developer</strong> needed to complete the team.</span>
          </div>
          <Link
            href="/discover"
            className="text-xs font-bold text-primary hover:underline shrink-0"
          >
            Find a builder →
          </Link>
        </div>
      </div>

      {/* Empty / Formation CTA */}
      <div className="card !p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 flex items-center justify-center mx-auto">
          <Users size={22} />
        </div>
        <h3 className="font-bold text-base text-gray-900 dark:text-white">Looking for more squads?</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          You can participate in multiple side projects, research groups, or hackathon teams simultaneously.
        </p>
        <div className="pt-2">
          <Link href="/projects" className="btn-outline text-xs !py-2 !px-4">
            Browse Recruiting Projects
          </Link>
        </div>
      </div>
    </div>
  );
}

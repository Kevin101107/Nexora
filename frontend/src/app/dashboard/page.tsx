"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import {
  Users,
  FolderGit2,
  Inbox,
  ArrowRight,
  Plus,
  Compass,
  Sparkles,
  CheckCircle2,
  Clock,
  Code2,
  Layers,
  ChevronRight,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  display_name?: string | null;
  headline?: string | null;
  skills?: string[];
  roles?: string[];
  availability?: string | null;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const api = createApiClient(session.access_token);
        const p = await api.get<UserProfile>("/users/me").catch(() => null);
        if (p) setProfile(p);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Builder";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* ── Welcome Header ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Phase 1 Collaboration Beta</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Welcome back, {displayName} 👋
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed">
              Discover compatible teammates, recruit members for your projects, and form squads for upcoming hackathons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/discover"
              className="btn-primary text-xs sm:text-sm !py-2.5 !px-4"
            >
              <Compass size={16} />
              <span>Find Teammates</span>
            </Link>
            <Link
              href="/projects"
              className="btn-outline text-xs sm:text-sm !py-2.5 !px-4"
            >
              <Plus size={16} />
              <span>Explore Projects</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Quick Stats / Overview ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card !p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Teammate Matches
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">12</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">With complementary skills</p>
        </div>

        <div className="card !p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Open Projects
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FolderGit2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">8</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Recruiting student builders</p>
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
          <p className="text-2xl font-black text-gray-900 dark:text-white">2</p>
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
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 capitalize">
            {profile?.availability || "Active"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Open for collaborations</p>
        </div>
      </div>

      {/* ── Main Content Grid: Teammates & Requests ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recommended Teammates */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recommended Teammates</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Explainable matches based on complementary technical skills and availability
              </p>
            </div>
            <Link
              href="/discover"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {/* Teammate Card 1 */}
            <div className="card !p-4 sm:!p-5 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-sm shrink-0">
                  AR
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Aarav Rao</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      95% Match
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Backend / Systems • Computer Science &apos;26
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1.5 font-medium">
                    Complementary stack: Docker, Go, Redis • Looking for Frontend / Fullstack partner
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] font-medium">
                      Go
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] font-medium">
                      FastAPI
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] font-medium">
                      Docker
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 sm:text-right">
                <Link
                  href="/discover"
                  className="btn-outline !py-1.5 !px-3 text-xs w-full sm:w-auto"
                >
                  Connect
                </Link>
              </div>
            </div>

            {/* Teammate Card 2 */}
            <div className="card !p-4 sm:!p-5 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold flex items-center justify-center text-sm shrink-0">
                  SK
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Sneha Kapoor</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      91% Match
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Product Designer & UI Engineer • Design &apos;27
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1.5 font-medium">
                    Complementary stack: Figma, Tailwind, Next.js • Preparing for Fall Hackathon
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] font-medium">
                      UI/UX
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] font-medium">
                      Figma
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] font-medium">
                      Tailwind
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 sm:text-right">
                <Link
                  href="/discover"
                  className="btn-outline !py-1.5 !px-3 text-xs w-full sm:w-auto"
                >
                  Connect
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Requests & Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Incoming Requests</h2>
            <Link
              href="/requests"
              className="text-xs font-bold text-primary hover:underline"
            >
              Manage
            </Link>
          </div>

          <div className="card !p-5 space-y-4">
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 dark:text-white">DevMatch Project</span>
                <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Pending Join
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Priya M. applied for <strong>Frontend Lead</strong> role.
              </p>
              <div className="flex gap-2 mt-3">
                <Link
                  href="/requests"
                  className="btn-primary !py-1 !px-3 text-[11px]"
                >
                  Review
                </Link>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 dark:text-white">Teammate Connection</span>
                <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full">
                  New Connect
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Rahul V. wants to connect for <strong>HackMIT 2026</strong>.
              </p>
              <div className="flex gap-2 mt-3">
                <Link
                  href="/requests"
                  className="btn-outline !py-1 !px-3 text-[11px]"
                >
                  Accept
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Open Projects & Opportunities ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Featured Projects Recruiting</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Student projects actively looking for teammates and contributors
            </p>
          </div>
          <Link
            href="/projects"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Explore all projects</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card !p-5 hover:border-primary/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                  Hackathon Squad
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} /> 2 slots left
                </span>
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Campus Pulse Radar</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                Real-time campus occupancy & study spot availability tracker using IoT sensors and Next.js.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300">
                  Needed: Hardware / IoT
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300">
                  Needed: Mobile Dev
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Team: 2/4 members</span>
              <Link
                href="/projects"
                className="text-xs font-bold text-primary hover:underline"
              >
                Apply to join →
              </Link>
            </div>
          </div>

          <div className="card !p-5 hover:border-primary/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  Side Project
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} /> 1 slot left
                </span>
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">OpenSource Course Planner</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                Prerequisite graph visualizer and graduation degree audit for university engineering students.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300">
                  Needed: D3.js / Graph Dev
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300">
                  Needed: Python Scraper
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Team: 3/4 members</span>
              <Link
                href="/projects"
                className="text-xs font-bold text-primary hover:underline"
              >
                Apply to join →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

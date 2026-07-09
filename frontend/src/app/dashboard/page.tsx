"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import Link from "next/link";
import {
  FileText, Timer, Sparkles, Layers, TrendingUp, Flame,
  Star, ArrowRight, Trophy, Clock, Calendar, CheckCircle
} from "lucide-react";

interface Stats {
  notes: number;
  focusSessions: number;
  focusMinutes: number;
  streak: number;
  xp: number;
  level: number;
}

interface RecentSession {
  id: string;
  duration_minutes: number;
  mode: string;
  subject: string | null;
  created_at: string;
}

const QUOTES = [
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Believe you can and you're halfway there.",
];

// Simple helper to format dates nicely
function formatRelativeDate(isoString: string) {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ notes: 0, focusSessions: 0, focusMinutes: 0, streak: 0, xp: 0, level: 1 });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  // States for animated numbers
  const [displayXp, setDisplayXp] = useState(0);
  const [displayMinutes, setDisplayMinutes] = useState(0);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const api = createApiClient(session.access_token);

      try {
        const [profile, sessions] = await Promise.all([
          api.get<any>("/users/me").catch(() => null),
          api.get<RecentSession[]>("/focus/sessions").catch(() => []),
        ]);

        const notesRes = await supabase.from("notes").select("id", { count: "exact" }).eq("user_id", session.user.id);
        
        setName(profile?.display_name || session.user.email?.split("@")[0] || "Student");
        
        const finalStats = {
          notes: notesRes.count ?? 0,
          focusSessions: sessions?.length ?? 0,
          focusMinutes: sessions?.reduce((s: number, x: any) => s + (x.duration_minutes || 0), 0) ?? 0,
          streak: profile?.streak ?? 0,
          xp: profile?.xp ?? 0,
          level: profile?.level ?? 1,
        };

        setStats(finalStats);
        setRecentSessions(sessions.slice(0, 4)); // Show last 4 sessions

        // Animate XP
        let currentXp = 0;
        const xpStep = Math.max(1, Math.floor(finalStats.xp / 40));
        const xpInterval = setInterval(() => {
          currentXp += xpStep;
          if (currentXp >= finalStats.xp) {
            setDisplayXp(finalStats.xp);
            clearInterval(xpInterval);
          } else {
            setDisplayXp(currentXp);
          }
        }, 20);

        // Animate Minutes
        let currentMins = 0;
        const minsStep = Math.max(1, Math.floor(finalStats.focusMinutes / 40));
        const minsInterval = setInterval(() => {
          currentMins += minsStep;
          if (currentMins >= finalStats.focusMinutes) {
            setDisplayMinutes(finalStats.focusMinutes);
            clearInterval(minsInterval);
          } else {
            setDisplayMinutes(currentMins);
          }
        }, 20);

      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const xpProgress = stats.xp % 100;

  // Mock consistency checklist for the last 5 days
  const last5Days = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      dayName: d.toLocaleDateString(undefined, { weekday: "short" }),
      dateLabel: d.getDate(),
      completed: i < stats.streak || i === 0, // Mock completed study goal based on streak
    };
  }).reverse();

  return (
    <div className="max-w-5xl space-y-6 animate-fade-up">
      {/* ── Welcome Banner ────────────────────────────────── */}
      <section className="card bg-gradient-to-br from-[#f8f6f0] to-[#f2eee4] dark:from-[#131326] dark:to-[#0d0d1c] border border-gray-200/50 dark:border-white/[0.04] p-6 sm:p-8 rounded-3xl relative overflow-hidden">
        {/* Animated background blobs for banner */}
        <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="inline-flex w-fit items-center rounded-full border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-700 dark:text-white/60">
            Study Command Center
          </div>
          <h1 className="font-display text-[2.75rem] leading-[0.92] text-gray-900 dark:text-white sm:text-5xl font-black">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {name || "Student"}
          </h1>
          <p className="max-w-2xl text-base text-gray-750 dark:text-white/70 italic leading-relaxed">
            "{quote}"
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/focus" className="btn-primary pill-cta hover:scale-[1.02] hover:-translate-y-0.5 transition-all">
              Start Focus Session
              <ArrowRight size={16} />
            </Link>
            <Link href="/ai" className="btn-outline pill-cta bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] hover:scale-[1.02] hover:-translate-y-0.5 transition-all">
              Ask AI Tutor
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Overview Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Notes Created", value: stats.notes, icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", suffix: "" },
          { label: "Focus Sessions", value: stats.focusSessions, icon: Timer, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", suffix: "" },
          { label: "Total Focus time", value: displayMinutes, icon: Clock, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-500/10", suffix: "m" },
          { label: "Day Streak", value: stats.streak, icon: Flame, color: "text-orange-500 animate-pulse", bg: "bg-orange-50 dark:bg-orange-500/10", suffix: " days" },
        ].map(({ label, value, icon: Icon, color, bg, suffix }) => (
          <div key={label} className="card border border-gray-200/50 dark:border-white/[0.04] p-5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {loading ? "—" : `${value}${suffix}`}
            </p>
            <p className="text-xs font-bold text-gray-700 dark:text-white/60 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Middle Layout: Progress & Consistency ─────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        
        {/* Left Side: Level Progress & Activity feed */}
        <div className="space-y-6">
          {/* Level Progress Widget */}
          <div className="card border border-gray-200/50 dark:border-white/[0.04] p-6 hover:shadow-md transition-all">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
                  <Trophy size={18} className="text-primary animate-bounce" />
                </div>
                <div>
                  <p className="text-base font-black text-gray-900 dark:text-white">Level {stats.level}</p>
                  <p className="text-xs font-bold text-gray-700 dark:text-white/50">{loading ? "—" : `${displayXp} XP`} total accumulated</p>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-white/50">{xpProgress}/100 to level {stats.level + 1}</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(108,99,255,0.4)]" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          {/* Focus History Feed */}
          <div className="card border border-gray-200/50 dark:border-white/[0.04] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-gray-900 dark:text-white">Recent Focus Sessions</h2>
              <Link href="/focus" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-50 dark:bg-white/[0.02] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-700 dark:text-white/40">
                No focus sessions logged yet. Let's start your first session!
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/[0.02] border border-gray-100/50 dark:border-white/[0.03] hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Timer size={14} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {session.duration_minutes}m session
                        </p>
                        <p className="text-[10px] font-bold text-gray-700 dark:text-white/50 uppercase tracking-wider">
                          {session.subject || "General Study"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 dark:text-white/50">
                      {formatRelativeDate(session.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Consistency Tracker & Quick Actions */}
        <div className="space-y-6">
          {/* Consistency Tracker */}
          <div className="card border border-gray-200/50 dark:border-white/[0.04] p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Study consistency</h3>
            <div className="flex items-center justify-between">
              {last5Days.map((d, index) => (
                <div key={index} className="text-center">
                  <p className="text-[10px] font-bold text-gray-700 dark:text-white/40 uppercase mb-2">{d.dayName}</p>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto border transition-all ${
                    d.completed 
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/20 text-emerald-500" 
                      : "border-gray-200 dark:border-white/[0.06] text-gray-400 dark:text-white/20"
                  }`}>
                    {d.completed ? <CheckCircle size={14} /> : <span className="text-xs font-bold">{d.dateLabel}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-white/50 pl-1">Quick actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/notes",      label: "New note",    icon: FileText, desc: "Capture ideas" },
                { href: "/focus",      label: "Start focus", icon: Timer,    desc: "Study session" },
                { href: "/ai",         label: "Ask AI",      icon: Sparkles, desc: "Gemini tutor" },
                { href: "/flashcards", label: "Flashcards",  icon: Layers,   desc: "AI generate" },
              ].map(({ href, label, icon: Icon, desc }) => (
                <Link key={href} href={href} className="card group cursor-pointer border border-gray-200/50 dark:border-white/[0.04] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_24px_rgba(108,99,255,0.08)]">
                  <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20 dark:bg-primary/15">
                    <Icon size={14} className="text-primary" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{label}</p>
                  <p className="text-[10px] text-gray-700 dark:text-white/45 mt-0.5 leading-snug">{desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import Link from "next/link";
import {
  FileText, Timer, Sparkles, Layers, TrendingUp, Flame,
  Star, ArrowRight, Trophy, Clock, Calendar, CheckCircle,
  Lightbulb, Brain, ChevronRight
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
  "Great things never come from comfort zones.",
  "Success doesn't just find you. You have to go out and get it.",
  "Believe you can and you're halfway there.",
];

// Helper to determine greeting icon
function getGreetingInfo() {
  const hrs = new Date().getHours();
  if (hrs < 12) return { text: "Good morning", icon: "☀️" };
  if (hrs < 17) return { text: "Good afternoon", icon: "🌤️" };
  return { text: "Good evening", icon: "🌙" };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ notes: 0, focusSessions: 0, focusMinutes: 0, streak: 0, xp: 0, level: 1 });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [latestNoteTitle, setLatestNoteTitle] = useState<string | null>(null);
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

        const notesRes = await supabase.from("notes").select("title, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false });
        
        setName(profile?.display_name || session.user.email?.split("@")[0] || "Student");
        
        const finalStats = {
          notes: notesRes.data?.length ?? 0,
          focusSessions: sessions?.length ?? 0,
          focusMinutes: sessions?.reduce((s: number, x: any) => s + (x.duration_minutes || 0), 0) ?? 0,
          streak: profile?.streak ?? 0,
          xp: profile?.xp ?? 0,
          level: profile?.level ?? 1,
        };

        if (notesRes.data && notesRes.data.length > 0) {
          setLatestNoteTitle(notesRes.data[0].title);
        }

        setStats(finalStats);
        setRecentSessions(sessions.slice(0, 4));

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

  const { text: greetingText, icon: greetingIcon } = getGreetingInfo();
  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const xpProgress = stats.xp % 100;
  
  // Daily target configurations
  const focusGoalMinutes = 180; // 3 hours daily goal
  const focusProgressPercent = Math.min(100, Math.round((stats.focusMinutes / focusGoalMinutes) * 100));

  // Circular progress ring helper values
  const strokeRadius = 15;
  const strokeCircumference = 2 * Math.PI * strokeRadius;
  const strokeDashoffset = strokeCircumference - (focusProgressPercent / 100) * strokeCircumference;

  // Mock GitHub-Style consistency density map (4 weeks = 28 boxes)
  // We code-color them by mock density based on streak
  const studyBoxes = Array.from({ length: 28 }).map((_, i) => {
    let level = 0; // 0=none, 1=light, 2=medium, 3=deep study density
    if (i % 5 === 0) level = 1;
    if (i % 7 === 0) level = 2;
    if (i % 11 === 0) level = 3;
    // Highlight last i matching active streak
    if (i >= 28 - Math.max(1, stats.streak)) {
      level = Math.min(3, Math.max(1, (i % 3) + 1));
    }
    return { level };
  });

  return (
    <div className="w-full space-y-6 animate-fade-up max-w-7xl px-2">
      
      {/* ── Top Header Section (Split Grid Layout) ────────── */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        {/* Left Side: Welcomer Banner */}
        <section className="card bg-gradient-to-br from-[#f8f6f0] to-[#f2eee4] dark:from-[#131326] dark:to-[#0d0d1c] border border-gray-200/50 dark:border-white/[0.04] p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-primary/10 blur-3xl" />
          
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{greetingIcon}</span>
              <div className="inline-flex w-fit items-center rounded-full border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] px-4.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-700 dark:text-white/60">
                Study Command Center
              </div>
            </div>
            <h1 className="font-display text-[2.75rem] leading-[0.92] text-gray-900 dark:text-white sm:text-5xl font-black">
              {greetingText}, {name || "Student"}
            </h1>
            <p className="max-w-2xl text-sm text-gray-700 dark:text-white/60 leading-relaxed font-semibold italic">
              "{quote}"
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 relative z-10">
            <Link href="/focus" className="btn-primary pill-cta hover:scale-[1.02] hover:-translate-y-0.5 transition-all text-xs">
              Start Focus Session
              <ArrowRight size={14} />
            </Link>
            <Link href="/ai" className="btn-outline pill-cta bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] hover:scale-[1.02] hover:-translate-y-0.5 transition-all text-xs">
              Ask AI Tutor
            </Link>
          </div>
        </section>

        {/* Right Side: Proactive AI Coach & Goals widget */}
        <section className="card bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20 dark:border-primary/10 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden min-h-[220px]">
          <div className="absolute right-0 bottom-0 w-32 h-32 rounded-full bg-primary/20 blur-2xl" />
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Sparkles size={14} className="text-primary animate-pulse" />
            AI Study Coach
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1.5 mt-2">Next Suggested Task</h3>
            <p className="text-xs text-gray-750 dark:text-white/70 leading-relaxed font-semibold">
              "You haven't practiced your Chemistry Flashcards today. Reviewing them now will help lock in your memory streak."
            </p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-primary/20 mt-3">
            <div className="text-[10px] font-bold text-primary tracking-wide">
              Estimated Completion: <span className="underline">12 minutes</span>
            </div>
            <Link href="/flashcards" className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline">
              Practice now
              <ChevronRight size={14} />
            </Link>
          </div>
        </section>
      </div>

      {/* ── Visual Variety Stats Cards Grid ──────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Notes stats card */}
        <div className="card border border-gray-200/50 dark:border-white/[0.04] p-5 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <FileText size={17} className="text-blue-500" />
            </div>
            <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.notes}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">Notes Created</p>
            <p className="text-[10px] text-gray-700 dark:text-white/40 font-bold truncate mt-0.5">
              {latestNoteTitle ? `Latest: ${latestNoteTitle}` : "No notes created yet"}
            </p>
          </div>
        </div>

        {/* Focus sessions stats card */}
        <div className="card border border-gray-200/50 dark:border-white/[0.04] p-5 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Timer size={17} className="text-emerald-500" />
            </div>
            <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.focusSessions}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">Focus Sessions</p>
            <p className="text-[10px] text-gray-700 dark:text-white/40 font-bold truncate mt-0.5">
              {stats.focusSessions > 0 ? "Daily goal in progress" : "No sessions completed today"}
            </p>
          </div>
        </div>

        {/* Focus hours stats card with circular progress ring */}
        <div className="card border border-gray-200/50 dark:border-white/[0.04] p-5 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex justify-between items-center h-[125px] cursor-default">
          <div className="flex flex-col justify-between h-full py-0.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <Clock size={17} className="text-violet-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">Total Focus Time</p>
              <p className="text-[10px] text-gray-700 dark:text-white/40 font-bold truncate mt-0.5">
                {displayMinutes}m / {focusGoalMinutes}m target
              </p>
            </div>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r={strokeRadius} strokeWidth="3.5" stroke="currentColor" className="text-gray-100 dark:text-white/[0.04]" fill="transparent" />
              <circle cx="24" cy="24" r={strokeRadius} strokeWidth="3.5" stroke="currentColor" className="text-violet-500 transition-all duration-700" fill="transparent"
                strokeDasharray={strokeCircumference}
                strokeDashoffset={loading ? strokeCircumference : strokeDashoffset}
              />
            </svg>
            <span className="absolute text-[10px] font-black text-gray-900 dark:text-white">{focusProgressPercent}%</span>
          </div>
        </div>

        {/* Day streak stats card with flame pulse */}
        <div className="card border border-gray-200/50 dark:border-white/[0.04] p-5 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <Flame size={17} className="text-orange-500 animate-pulse" />
            </div>
            <span className="text-2xl font-black text-orange-500 animate-pulse">🔥 {stats.streak}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">Active Streak</p>
            <p className="text-[10px] text-gray-700 dark:text-white/40 font-bold truncate mt-0.5">
              {stats.streak > 0 ? "You're keeping the fire hot!" : "Log in tomorrow to build streak"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Middle Layout: Progress, Charts, Consistency ────── */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        
        {/* Left Side: Level Progress & SVG Charts */}
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
            <div className="h-2.5 bg-gray-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(108,99,255,0.4)]" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          {/* SVG Weekly Focus Chart */}
          <div className="card border border-gray-200/50 dark:border-white/[0.04] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Weekly Focus Analysis</h3>
                <p className="text-[10px] text-gray-700 dark:text-white/40 font-bold mt-0.5">Focus hours distribution by weekday</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-white/60">
                <span className="w-2.5 h-2.5 rounded bg-primary" />
                Study hours
              </div>
            </div>

            {/* Custom Interactive SVG Chart */}
            <div className="relative w-full h-[180px] mt-4 flex items-end">
              <svg className="w-full h-[160px] overflow-visible">
                {/* SVG definitions for gradient fill */}
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6C63FF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                {[0, 25, 50, 75, 100].map((percent, idx) => (
                  <line key={idx} x1="0" y1={percent} x2="100%" y2={percent} stroke="currentColor" className="text-gray-100 dark:text-white/[0.03]" strokeWidth="1" />
                ))}

                {/* Simulated Chart Bars (dynamic widths) */}
                {[
                  { day: "Mon", hrs: 2.2, val: 55 },
                  { day: "Tue", hrs: 3.5, val: 80 },
                  { day: "Wed", hrs: 1.0, val: 30 },
                  { day: "Thu", hrs: 0.0, val: 0  },
                  { day: "Fri", hrs: 2.8, val: 65 },
                  { day: "Sat", hrs: 4.1, val: 95 },
                  { day: "Sun", hrs: 1.5, val: 40 },
                ].map((item, idx) => {
                  const barWidth = 32;
                  const xPos = `${idx * 14.28 + 4.5}%`;
                  const barHeight = loading ? 0 : item.val;

                  return (
                    <g key={idx}>
                      {/* Bar Fill */}
                      <rect x={xPos} y={100 - barHeight} width={barWidth} height={barHeight} className="text-primary/10 fill-current rounded-lg" rx="4" />
                      {/* Highlight Top Indicator Line */}
                      <rect x={xPos} y={100 - barHeight} width={barWidth} height="4" className="text-primary fill-current" rx="2" />
                      {/* Hover text label */}
                      <text x={`${idx * 14.28 + 6.8}%`} y={90 - barHeight} textAnchor="middle" className="text-[10px] font-black text-primary opacity-0 hover:opacity-100 transition-opacity fill-current">
                        {item.hrs}h
                      </text>
                      {/* Day text bottom */}
                      <text x={`${idx * 14.28 + 6.8}%`} y="118" textAnchor="middle" className="text-[10px] font-bold text-gray-700 dark:text-white/40 fill-current">
                        {item.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Right Side: GitHub Consistency Grid & Quick Actions */}
        <div className="space-y-6">
          {/* GitHub-style Study Consistency calendar grid */}
          <div className="card border border-gray-200/50 dark:border-white/[0.04] p-5">
            <div className="flex flex-col gap-1 mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Study Consistency</h3>
              <p className="text-[10px] text-gray-700 dark:text-white/40 font-bold">Study density over the last 4 weeks</p>
            </div>
            
            <div className="grid grid-cols-7 gap-1.5 w-fit mx-auto">
              {studyBoxes.map((box, index) => (
                <div
                  key={index}
                  className={`w-6 h-6 rounded-lg transition-colors ${
                    box.level === 0 ? "bg-gray-100 dark:bg-white/[0.03] border border-gray-200/20 dark:border-white/[0.02]" :
                    box.level === 1 ? "bg-primary/20 border border-primary/20" :
                    box.level === 2 ? "bg-primary/45 border border-primary/30" :
                    "bg-primary text-white border border-primary/40"
                  }`}
                  title={`Study Density Level: ${box.level}`}
                />
              ))}
            </div>
            
            <div className="flex justify-between items-center text-[9px] font-bold text-gray-700 dark:text-white/35 mt-4 px-1 uppercase tracking-wider">
              <span>Less active</span>
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded bg-gray-100 dark:bg-white/[0.03]" />
                <span className="w-2.5 h-2.5 rounded bg-primary/20" />
                <span className="w-2.5 h-2.5 rounded bg-primary/45" />
                <span className="w-2.5 h-2.5 rounded bg-primary" />
              </div>
              <span>More active</span>
            </div>
          </div>

          {/* Quick Actions Grid with Hover Effects */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-white/50 pl-1">Quick actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/notes",      label: "New note",    icon: FileText, desc: "Capture ideas" },
                { href: "/focus",      label: "Start focus", icon: Timer,    desc: "Study session" },
                { href: "/ai",         label: "Ask AI",      icon: Sparkles, desc: "Gemini tutor" },
                { href: "/flashcards", label: "Flashcards",  icon: Layers,   desc: "AI generate" },
              ].map(({ href, label, icon: Icon, desc }) => (
                <Link key={href} href={href} className="card group cursor-pointer border border-gray-200/50 dark:border-white/[0.04] p-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_16px_36px_rgba(108,99,255,0.15)]">
                  <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20 dark:bg-primary/15">
                    <Icon size={14} className="text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{label}</p>
                  <p className="text-[10px] text-gray-700 dark:text-white/45 mt-0.5 leading-snug">{desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Focus Sessions (Guidance Empty State) ───── */}
      <section className="card border border-gray-200/50 dark:border-white/[0.04] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white">Recent Focus Sessions</h2>
            <p className="text-[10px] text-gray-700 dark:text-white/40 font-bold mt-0.5">Logs of your completed pomodoro sessions</p>
          </div>
          {recentSessions.length > 0 && (
            <Link href="/focus" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-50 dark:bg-white/[0.02] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          /* Premium Empty State */
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 text-2xl text-primary animate-pulse">
              🧠
            </div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1.5">No focus sessions yet</h3>
            <p className="text-xs text-gray-700 dark:text-white/45 max-w-xs leading-relaxed mb-5 font-semibold">
              Ready to study? Start your first 25-minute Pomodoro focus session now to earn XP.
            </p>
            <Link href="/focus" className="btn-primary pill-cta text-xs px-5 py-2.5 font-bold hover:scale-[1.02] transition-transform">
              Start Focus Session
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex flex-col justify-between p-4 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-gray-150 dark:border-white/[0.03] hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Timer size={13} className="text-emerald-500 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-black text-gray-700 dark:text-white/40 uppercase tracking-widest truncate">
                    {session.subject || "General"}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-gray-900 dark:text-white">{session.duration_minutes}</span>
                  <span className="text-[10px] font-bold text-gray-700 dark:text-white/40 uppercase">minutes</span>
                </div>
                <div className="text-[10px] font-bold text-gray-700 dark:text-white/50 border-t border-gray-100/50 dark:border-white/[0.04] pt-2 mt-3 flex justify-between items-center">
                  <span>{session.mode}</span>
                  <span>{new Date(session.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

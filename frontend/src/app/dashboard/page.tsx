"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import Link from "next/link";
import { FileText, Timer, Sparkles, Layers, TrendingUp, Flame, Star, ArrowRight } from "lucide-react";

interface Stats {
  notes: number;
  focusSessions: number;
  focusMinutes: number;
  streak: number;
  xp: number;
  level: number;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ notes: 0, focusSessions: 0, focusMinutes: 0, streak: 0, xp: 0, level: 1 });
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const api = createApiClient(session.access_token);

      try {
        const [profile, sessions] = await Promise.all([
          api.get<any>("/users/me").catch(() => null),
          api.get<any[]>("/focus/sessions").catch(() => []),
        ]);

        const notesRes = await supabase.from("notes").select("id", { count: "exact" }).eq("user_id", session.user.id);
        setName(profile?.display_name || session.user.email?.split("@")[0] || "Student");
        setStats({
          notes: notesRes.count ?? 0,
          focusSessions: sessions?.length ?? 0,
          focusMinutes: sessions?.reduce((s: number, x: any) => s + (x.duration_minutes || 0), 0) ?? 0,
          streak: profile?.streak ?? 0,
          xp: profile?.xp ?? 0,
          level: profile?.level ?? 1,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const xpProgress = stats.xp % 100;

  return (
    <div className="max-w-5xl editorial-atmo">
      <section className="card mb-6 overflow-hidden bg-[#f7f4ee] dark:bg-[#15152a]">
        <div className="flex flex-col gap-5">
          <div className="inline-flex w-fit items-center rounded-full border border-[#e6ded0] dark:border-white/15 bg-white/70 dark:bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-white/55">
            Your study command center
          </div>
          <h1 className="font-display text-5xl leading-[0.92] text-[#151f3f] dark:text-white sm:text-6xl">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {name || "Student"}
          </h1>
          <p className="max-w-2xl text-lg text-gray-600 dark:text-white/70">{quote}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link href="/focus" className="btn-primary pill-cta">
              Start Focus Session
              <ArrowRight size={16} />
            </Link>
            <Link href="/ai" className="btn-outline pill-cta bg-white/80 dark:bg-white/5">
              Ask AI Tutor
            </Link>
          </div>
        </div>
      </section>

      <div className="card mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
              <Star size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Level {stats.level}</p>
              <p className="text-xs text-gray-400 dark:text-white/30">{stats.xp} XP total</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 dark:text-white/30">{xpProgress}/100 to next level</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${xpProgress}%` }} />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Notes",         value: stats.notes,                                              icon: FileText,   color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "Focus sessions", value: stats.focusSessions,                                     icon: Timer,      color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Focus hours",   value: Math.round((stats.focusMinutes / 60) * 10) / 10,          icon: TrendingUp, color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-500/10" },
          { label: "Day streak",    value: stats.streak,                                             icon: Flame,      color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? "—" : value}</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-white/40">Quick actions</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { href: "/notes",      label: "New note",    icon: FileText, desc: "Capture ideas" },
          { href: "/focus",      label: "Start focus", icon: Timer,    desc: "Pomodoro timer" },
          { href: "/ai",         label: "Ask AI",      icon: Sparkles, desc: "Chat & explain" },
          { href: "/flashcards", label: "Flashcards",  icon: Layers,   desc: "Review & learn" },
        ].map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href} className="card group cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_40px_rgba(108,99,255,0.16)]">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20 dark:bg-primary/15">
              <Icon size={17} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

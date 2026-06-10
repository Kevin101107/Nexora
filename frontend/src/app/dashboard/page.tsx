"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import Link from "next/link";
import { FileText, Timer, Sparkles, Layers, TrendingUp, Flame, Star } from "lucide-react";

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
      if (!session) return;
      const api = createApiClient(session.access_token);

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
      setLoading(false);
    })();
  }, []);

  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const xpProgress = stats.xp % 100;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
          <span className="text-primary">{name}</span>
        </h1>
        <p className="text-sm text-gray-400 dark:text-white/30 mt-1 italic">&ldquo;{quote}&rdquo;</p>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <h2 className="text-xs font-semibold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3">Quick actions</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: "/notes",      label: "New note",    icon: FileText, desc: "Capture ideas" },
          { href: "/focus",      label: "Start focus", icon: Timer,    desc: "Pomodoro timer" },
          { href: "/ai",         label: "Ask AI",      icon: Sparkles, desc: "Chat & explain" },
          { href: "/flashcards", label: "Flashcards",  icon: Layers,   desc: "Review & learn" },
        ].map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href} className="card hover:border-primary/30 hover:shadow-md transition-all duration-150 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
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

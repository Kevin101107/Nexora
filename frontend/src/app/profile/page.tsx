"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { Star, Flame, Award, Zap } from "lucide-react";

const BADGE_META: Record<string, { label: string; icon: string }> = {
  first_note:       { label: "First Note",      icon: "📝" },
  streak_3:         { label: "3-Day Streak",     icon: "🔥" },
  streak_7:         { label: "7-Day Streak",     icon: "🔥" },
  streak_30:        { label: "30-Day Streak",    icon: "💯" },
  level_5:          { label: "Level 5",          icon: "⭐" },
  level_10:         { label: "Level 10",         icon: "🌟" },
  focus_60:         { label: "60-Min Focus",     icon: "⏱️" },
  flashcard_master: { label: "Flashcard Master", icon: "🃏" },
};
const SUBJECTS = ["Math", "Physics", "Chemistry", "Biology", "History", "English", "Computer Science", "Other"];

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [goalMinutes, setGoalMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      const api = createApiClient(session.access_token);
      const p = await api.get<any>("/users/me").catch(() => null);
      if (p) {
        setProfile(p);
        setName(p.display_name || "");
        setSubjects(p.favourite_subjects || []);
        setGoalMinutes(p.daily_goal_minutes || 60);
      }
    });
  }, []);

  async function save() {
    if (!token) return;
    setSaving(true);
    const api = createApiClient(token);
    try {
      await api.put("/users/me", { display_name: name || null, favourite_subjects: subjects, daily_goal_minutes: goalMinutes });
      toast("Profile saved");
    } catch { toast("Failed to save", "error"); }
    setSaving(false);
  }

  const xpProgress = profile ? profile.xp % 100 : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-sm text-gray-400 dark:text-white/30 mt-0.5">{profile?.email}</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center text-2xl font-black text-primary">
            {profile?.level ?? 1}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Level {profile?.level ?? 1}</p>
            <p className="text-sm text-gray-400 dark:text-white/30">{profile?.xp ?? 0} XP total</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-white/30 mb-1.5">
          <span>Level {profile?.level ?? 1}</span>
          <span>{xpProgress}/100 XP</span>
          <span>Level {(profile?.level ?? 1) + 1}</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${xpProgress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Streak",  value: profile?.streak ?? 0, icon: Flame,  color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10" },
          { label: "Badges",  value: (profile?.badges ?? []).length, icon: Award, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
          { label: "XP",      value: profile?.xp ?? 0, icon: Zap,   color: "text-primary", bg: "bg-primary/10 dark:bg-primary/15" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card text-center py-4">
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
              <Icon size={15} className={color} />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-400 dark:text-white/30">{label}</p>
          </div>
        ))}
      </div>

      {profile?.badges?.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b: string) => {
              const meta = BADGE_META[b] ?? { label: b, icon: "🏅" };
              return (
                <span key={b} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 dark:bg-primary/15 text-primary">
                  {meta.icon} {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Settings</h2>
        <div>
          <label className="label">Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Your name" />
        </div>
        <div>
          <label className="label">Daily focus goal (minutes)</label>
          <input type="number" min={15} max={480} value={goalMinutes} onChange={(e) => setGoalMinutes(Number(e.target.value))} className="input-field" />
        </div>
        <div>
          <label className="label">Favourite subjects</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubjects((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  subjects.includes(s)
                    ? "bg-primary text-white border-primary"
                    : "border-gray-200 dark:border-white/[0.1] text-gray-500 dark:text-white/40 hover:border-primary/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary w-full justify-center">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

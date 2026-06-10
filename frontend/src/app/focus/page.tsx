"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { useToast } from "@/components/Toast";

const MODES = [
  { id: "focus_25",  label: "Focus",       minutes: 25 },
  { id: "focus_45",  label: "Deep Work",   minutes: 45 },
  { id: "focus_60",  label: "Flow",        minutes: 60 },
  { id: "break_5",   label: "Short break", minutes: 5  },
  { id: "break_15",  label: "Long break",  minutes: 15 },
];
const SUBJECTS = ["Math", "Physics", "Chemistry", "Biology", "History", "English", "Computer Science", "Other"];

export default function FocusPage() {
  const [token, setToken] = useState("");
  const [modeId, setModeId] = useState("focus_25");
  const [subject, setSubject] = useState("");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const startedAt = useRef<Date>();
  const { toast } = useToast();

  const mode = MODES.find((m) => m.id === modeId) ?? MODES[0];

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      const api = createApiClient(session.access_token);
      const data = await api.get<any[]>("/focus/sessions").catch(() => []);
      setSessions(data);
    });
  }, []);

  const handleComplete = useCallback(async (durationMinutes: number) => {
    if (!token) return;
    const api = createApiClient(token);
    try {
      const session = await api.post<any>("/focus/session", {
        duration_minutes: durationMinutes, mode: modeId, subject: subject || null,
      });
      setSessions((p) => [session, ...p].slice(0, 20));
      toast(`Session complete! +${durationMinutes} XP`);
    } catch { toast("Could not save session", "error"); }
  }, [token, modeId, subject, toast]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            const elapsed = startedAt.current
              ? Math.round((Date.now() - startedAt.current.getTime()) / 60000)
              : mode.minutes;
            handleComplete(Math.max(1, elapsed));
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode.minutes, handleComplete]);

  function selectMode(id: string) {
    if (running) return;
    setModeId(id);
    setSeconds((MODES.find((m) => m.id === id)?.minutes ?? 25) * 60);
  }

  function toggleTimer() {
    if (!running) startedAt.current = new Date();
    setRunning((r) => !r);
  }

  function reset() { setRunning(false); setSeconds(mode.minutes * 60); }

  const total = mode.minutes * 60;
  const progress = (total - seconds) / total;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  function timeAgo(raw: string) {
    const diff = (Date.now() - new Date(raw).getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(raw).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Focus Timer</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card flex flex-col items-center py-8">
          <div className="flex flex-wrap justify-center gap-1.5 mb-8">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => selectMode(m.id)}
                disabled={running}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  modeId === m.id
                    ? "bg-primary text-white"
                    : "text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] disabled:cursor-not-allowed"
                }`}
              >
                {m.label} {m.minutes}m
              </button>
            ))}
          </div>

          <div className="relative w-52 h-52 mb-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="6"
                className="text-gray-100 dark:text-white/[0.07]" />
              <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="6"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                strokeLinecap="round" className="text-primary transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-gray-900 dark:text-white tabular-nums">{mins}:{secs}</span>
              <span className="text-xs text-gray-400 dark:text-white/30 mt-1">{mode.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <button onClick={reset} className="btn-outline p-3 rounded-xl"><RotateCcw size={16} /></button>
            <button onClick={toggleTimer} className="btn-primary px-8 py-3 gap-2">
              {running ? <><Pause size={18} /> Pause</> : <><Play size={18} /> {seconds === mode.minutes * 60 ? "Start" : "Resume"}</>}
            </button>
          </div>

          <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={running} className="input-field w-full text-sm">
            <option value="">No subject</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3">Recent sessions</h2>
          {sessions.length === 0 ? (
            <div className="card text-center py-10">
              <Timer size={24} className="text-gray-200 dark:text-white/15 mx-auto mb-2" />
              <p className="text-sm text-gray-400 dark:text-white/30">No sessions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="card py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.duration_minutes} min · {s.mode.replace("_", " ")}</p>
                    <p className="text-xs text-gray-400 dark:text-white/30">{s.subject || "No subject"} · {timeAgo(s.created_at)}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-lg">+{s.duration_minutes} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

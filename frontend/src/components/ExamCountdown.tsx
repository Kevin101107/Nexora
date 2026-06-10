"use client";

import { useState, useEffect } from "react";
import { GraduationCap, Plus, X, CalendarDays } from "lucide-react";

interface Exam {
  id: string;
  name: string;
  date: string;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function urgencyClasses(days: number): string {
  if (days < 0) return "text-gray-400 dark:text-white/25 bg-gray-100 dark:bg-white/[0.06]";
  if (days <= 3) return "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10";
  if (days <= 7) return "text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10";
  if (days <= 30) return "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10";
  return "text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10";
}

function urgencyLabel(days: number): string {
  if (days < 0) return "Past";
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow!";
  return `${days}d`;
}

export default function ExamCountdown() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nexora_exams");
      if (stored) setExams(JSON.parse(stored));
    } catch {}
  }, []);

  function save(next: Exam[]) {
    setExams(next);
    try { localStorage.setItem("nexora_exams", JSON.stringify(next)); } catch {}
  }

  function addExam() {
    if (!name.trim() || !date) return;
    save([...exams, { id: Date.now().toString(), name: name.trim(), date }]);
    setName("");
    setDate("");
    setShowForm(false);
  }

  function removeExam(id: string) {
    save(exams.filter((e) => e.id !== id));
  }

  const upcoming = exams
    .map((e) => ({ ...e, days: daysUntil(e.date) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/[0.07] bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/15">
            <GraduationCap size={15} className="text-violet-500 dark:text-violet-400" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Exam Countdown</h3>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:text-primary dark:hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/15 transition-all duration-200"
        >
          <Plus size={15} />
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 bg-primary/[0.06] dark:bg-primary/[0.12] rounded-xl border border-primary/10 dark:border-primary/20 space-y-2">
          <input
            className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
            placeholder="Exam name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExam()}
          />
          <input
            type="date"
            className="w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-white/[0.06] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors [color-scheme:dark]"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={addExam}
              disabled={!name.trim() || !date}
              className="flex-1 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-40"
            >
              Add Exam
            </button>
            <button
              onClick={() => { setShowForm(false); setName(""); setDate(""); }}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-white/40 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {upcoming.length === 0 ? (
        <div className="text-center py-7">
          <CalendarDays size={26} className="mx-auto text-gray-200 dark:text-white/10 mb-2" />
          <p className="text-xs text-gray-400 dark:text-white/25 mb-2">No exams added yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-primary hover:underline font-semibold"
          >
            + Add your first exam
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between gap-2 group p-1.5 -mx-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${urgencyClasses(exam.days)}`}>
                  {urgencyLabel(exam.days)}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-white/70 truncate">
                  {exam.name}
                </span>
              </div>
              <button
                onClick={() => removeExam(exam.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-300 dark:text-white/15 hover:text-red-400 dark:hover:text-red-400 transition-all shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

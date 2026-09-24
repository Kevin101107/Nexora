"use client";

import { useState } from "react";
import { MatchScoreResult } from "@/lib/types";
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles, AlertCircle, Info } from "lucide-react";

interface MatchScoreBadgeProps {
  match: MatchScoreResult;
  showDetails?: boolean;
}

export function getScoreTheme(score: number): {
  badgeBg: string;
  badgeText: string;
  border: string;
  barColor: string;
} {
  if (score >= 90) {
    return {
      badgeBg: "bg-emerald-50 dark:bg-emerald-500/10",
      badgeText: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-500/20",
      barColor: "bg-emerald-500",
    };
  } else if (score >= 75) {
    return {
      badgeBg: "bg-primary/10",
      badgeText: "text-primary",
      border: "border-primary/20",
      barColor: "bg-primary",
    };
  } else if (score >= 60) {
    return {
      badgeBg: "bg-blue-50 dark:bg-blue-500/10",
      badgeText: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-500/20",
      barColor: "bg-blue-500",
    };
  } else if (score >= 40) {
    return {
      badgeBg: "bg-amber-50 dark:bg-amber-500/10",
      badgeText: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-500/20",
      barColor: "bg-amber-500",
    };
  } else {
    return {
      badgeBg: "bg-gray-100 dark:bg-white/[0.05]",
      badgeText: "text-gray-500",
      border: "border-gray-200 dark:border-white/[0.08]",
      barColor: "bg-gray-400",
    };
  }
}

export default function MatchScoreBadge({ match, showDetails = false }: MatchScoreBadgeProps) {
  const [isOpen, setIsOpen] = useState(showDetails);
  const theme = getScoreTheme(match.score);

  const evidenceLabels = {
    high: { text: "High Evidence", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    medium: { text: "Medium Evidence", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    low: { text: "Limited Data", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  };

  const ev = evidenceLabels[match.evidence_quality] || evidenceLabels.medium;

  return (
    <div className="space-y-2">
      {/* Header Pill */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-bold border transition-colors ${theme.badgeBg} ${theme.badgeText} ${theme.border} hover:opacity-90`}
          title="Click to view match explanation"
        >
          <span>{match.score}% Match</span>
          <span className="text-[10px] font-medium opacity-80">• {match.score_label}</span>
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ev.color}`}
          title="Indicates how much structured profile data was available"
        >
          {ev.text}
        </span>
      </div>

      {/* Expandable Explanation Breakdown */}
      {isOpen && (
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] space-y-2.5 text-xs animate-in fade-in zoom-in-98 duration-150">
          <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Match Score Breakdown
          </div>

          {/* Component Bars */}
          {match.version === "v2" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04]">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                  <span>Skills (45%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{match.skill_score}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full ${theme.barColor}`} style={{ width: `${match.skill_score}%` }} />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04]">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                  <span>Role Exp (20%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{match.role_experience_score ?? match.role_score}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full ${theme.barColor}`} style={{ width: `${match.role_experience_score ?? match.role_score}%` }} />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04]">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                  <span>Availability (15%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{match.availability_score}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full ${theme.barColor}`} style={{ width: `${match.availability_score}%` }} />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04]">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                  <span>Reliability (10%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{match.reliability_score ?? 100}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full ${theme.barColor}`} style={{ width: `${match.reliability_score ?? 100}%` }} />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04] col-span-2 sm:col-span-1">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                  <span>Projects (10%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{match.project_experience_score ?? 100}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full ${theme.barColor}`} style={{ width: `${match.project_experience_score ?? 100}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04]">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                  <span>Skills (60%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{match.skill_score}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${theme.barColor}`}
                    style={{ width: `${match.skill_score}%` }}
                  />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04]">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                  <span>Role (25%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{match.role_score}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${theme.barColor}`}
                    style={{ width: `${match.role_score}%` }}
                  />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04]">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                  <span>Availability (15%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{match.availability_score}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${theme.barColor}`}
                    style={{ width: `${match.availability_score}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Missing Requirements Alert */}
          {match.missing_requirements && match.missing_requirements.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle size={13} />
                <span>Gaps to Address:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {match.missing_requirements.map((req, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-medium">
                    {req}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Matched & Missing Skills */}
          {(match.matched_skills.length > 0 || match.missing_skills.length > 0) && (
            <div className="space-y-1.5 pt-1">
              {match.matched_skills.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Matched:
                  </span>
                  {match.matched_skills.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/20"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              )}

              {match.missing_skills.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-400">Missing:</span>
                  {match.missing_skills.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reasons */}
          {match.reasons && match.reasons.length > 0 && (
            <div className="pt-1.5 border-t border-gray-100 dark:border-white/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Why this match:
              </span>
              <ul className="space-y-0.5 text-[11px] text-gray-600 dark:text-gray-300 list-disc list-inside">
                {match.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

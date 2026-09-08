"use client";

import { useState } from "react";
import {
  FolderGit2,
  Search,
  Plus,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  Send,
  Code2,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  stage: string;
  rolesNeeded: string[];
  skillsNeeded: string[];
  membersCount: number;
  maxMembers: number;
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: "p1",
    title: "Campus Pulse Radar",
    tagline: "Real-time library & dining hall occupancy visualizer",
    description: "Building an open IoT telemetry pipeline and responsive web map for campus facilities.",
    category: "Hackathon Squad",
    stage: "Prototype",
    rolesNeeded: ["Mobile Developer", "Hardware / IoT Engineer"],
    skillsNeeded: ["React Native", "MQTT", "Python", "Tailwind CSS"],
    membersCount: 2,
    maxMembers: 4,
  },
  {
    id: "p2",
    title: "OpenCoursePrereq",
    tagline: "Interactive curriculum DAG graph & degree auditor",
    description: "Helping undergraduates visualize required prerequisites and plan semesters without enrollment roadblocks.",
    category: "Side Project",
    stage: "In Progress",
    rolesNeeded: ["D3.js / Visualization Specialist", "Data Scraper"],
    skillsNeeded: ["TypeScript", "D3.js", "FastAPI", "BeautifulSoup"],
    membersCount: 3,
    maxMembers: 4,
  },
  {
    id: "p3",
    title: "FinLit Arcade",
    tagline: "Gamified financial literacy simulations for college students",
    description: "Web app simulating budgeting, credit cards, and student loan repayment through story-driven mini games.",
    category: "Hackathon Squad",
    stage: "Idea",
    rolesNeeded: ["Frontend Developer", "Game / Story Designer"],
    skillsNeeded: ["React", "Zustand", "Tailwind CSS", "Figma"],
    membersCount: 1,
    maxMembers: 4,
  },
  {
    id: "p4",
    title: "EchoNotes Voice Assistant",
    tagline: "Accessibility tool converting spoken lectures into clear transcripts & summaries",
    description: "Local speech-to-text pipeline designed specifically for students with auditory processing challenges.",
    category: "Research / Capstone",
    stage: "In Progress",
    rolesNeeded: ["ML Audio Specialist", "Accessibility QA"],
    skillsNeeded: ["Whisper AI", "Python", "WebRTC", "Next.js"],
    membersCount: 2,
    maxMembers: 3,
  },
];

const CATEGORIES = ["All Categories", "Hackathon Squad", "Side Project", "Research / Capstone"];

export default function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [appliedProjectIds, setAppliedProjectIds] = useState<string[]>([]);
  const { toast } = useToast();

  const filtered = SAMPLE_PROJECTS.filter((p) => {
    const matchesCategory =
      selectedCategory === "All Categories" || p.category === selectedCategory;
    const matchesQuery =
      query === "" ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.tagline.toLowerCase().includes(query.toLowerCase()) ||
      p.rolesNeeded.some((r) => r.toLowerCase().includes(query.toLowerCase())) ||
      p.skillsNeeded.some((s) => s.toLowerCase().includes(query.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  function handleApply(p: Project) {
    if (appliedProjectIds.includes(p.id)) return;
    setAppliedProjectIds((prev) => [...prev, p.id]);
    toast(`Application submitted to join "${p.title}"!`);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FolderGit2 size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Explore Projects
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Browse student projects and hackathon squads recruiting team members.
          </p>
        </div>

        <button
          type="button"
          onClick={() => toast("Project creation flow will be available in Phase 2!")}
          className="btn-primary text-xs sm:text-sm !py-2 !px-4 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Post a Project</span>
        </button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="card !p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by project title, needed role, or tech stack..."
            className="input-field pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
                selectedCategory === c
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Projects Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((project) => {
          const isApplied = appliedProjectIds.includes(project.id);
          const slotsLeft = project.maxMembers - project.membersCount;
          return (
            <div
              key={project.id}
              className="card !p-5 hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {project.category}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    <span>{slotsLeft} {slotsLeft === 1 ? "slot" : "slots"} open</span>
                  </span>
                </div>

                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  {project.title}
                </h3>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  {project.tagline}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  {project.description}
                </p>

                {/* Open roles needed */}
                <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Roles Needed:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.rolesNeeded.map((role) => (
                      <span
                        key={role}
                        className="text-xs px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Required skills */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.skillsNeeded.map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Squad: {project.membersCount}/{project.maxMembers} builders
                </span>

                <button
                  type="button"
                  onClick={() => handleApply(project)}
                  disabled={isApplied}
                  className={`btn-primary !py-1.5 !px-3.5 text-xs ${
                    isApplied ? "!bg-emerald-600 !opacity-100 cursor-default" : ""
                  }`}
                >
                  {isApplied ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Applied</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Apply to Join</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

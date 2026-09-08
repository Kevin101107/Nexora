"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Compass,
  Code2,
  Users,
  Sparkles,
  CheckCircle2,
  Send,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface Builder {
  id: string;
  name: string;
  avatar_initials: string;
  role: string;
  headline: string;
  university: string;
  year: string;
  skills: string[];
  interests: string[];
  availability: string;
  compatibilityScore: number;
  matchReason: string;
}

const SAMPLE_BUILDERS: Builder[] = [
  {
    id: "1",
    name: "Aarav Rao",
    avatar_initials: "AR",
    role: "Backend Engineer",
    headline: "Distributed systems enthusiast & Python/Go builder",
    university: "Computer Science",
    year: "Year 3",
    skills: ["Go", "FastAPI", "PostgreSQL", "Docker", "Redis"],
    interests: ["FinTech", "Cloud Infra", "Open Source"],
    availability: "Looking for Hackathon Squad",
    compatibilityScore: 95,
    matchReason: "High synergy: complements your frontend stack with solid Go & Docker expertise.",
  },
  {
    id: "2",
    name: "Sneha Kapoor",
    avatar_initials: "SK",
    role: "UI/UX & Product Designer",
    headline: "Design systems fanatic turning complex ideas into clean UI",
    university: "Design & HCI",
    year: "Year 2",
    skills: ["Figma", "UI/UX", "Tailwind CSS", "Prototyping", "Design Systems"],
    interests: ["EdTech", "Consumer Social", "Accessibility"],
    availability: "Open to Side Projects",
    compatibilityScore: 92,
    matchReason: "Fills user interface gap: expert in Figma and frontend components.",
  },
  {
    id: "3",
    name: "Marcus Vance",
    avatar_initials: "MV",
    role: "AI / ML Engineer",
    headline: "Building RAG pipelines and multimodal agents for health tech",
    university: "Data Science & AI",
    year: "Year 4",
    skills: ["Python", "PyTorch", "LangChain", "FastAPI", "Hugging Face"],
    interests: ["HealthTech", "AI Agents", "Bioinformatics"],
    availability: "Looking for Project Team",
    compatibilityScore: 88,
    matchReason: "Strong machine learning focus for projects requiring custom intelligence.",
  },
  {
    id: "4",
    name: "Tanvi Iyer",
    avatar_initials: "TI",
    role: "Mobile App Developer",
    headline: "Cross-platform mobile developer with React Native & Flutter",
    university: "Software Engineering",
    year: "Year 3",
    skills: ["React Native", "Flutter", "TypeScript", "Firebase", "GraphQL"],
    interests: ["Productivity", "Mobile Gaming", "Fitness"],
    availability: "Open to Collaborations",
    compatibilityScore: 84,
    matchReason: "Direct mobile client capability to complement web services.",
  },
];

const ROLES = ["All Roles", "Backend", "Frontend", "UI/UX", "AI / ML", "Mobile"];

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const { toast } = useToast();

  const filtered = SAMPLE_BUILDERS.filter((b) => {
    const matchesRole =
      selectedRole === "All Roles" ||
      b.role.toLowerCase().includes(selectedRole.toLowerCase());
    const matchesQuery =
      query === "" ||
      b.name.toLowerCase().includes(query.toLowerCase()) ||
      b.headline.toLowerCase().includes(query.toLowerCase()) ||
      b.skills.some((s) => s.toLowerCase().includes(query.toLowerCase()));
    return matchesRole && matchesQuery;
  });

  function handleConnect(builder: Builder) {
    if (connectedIds.includes(builder.id)) return;
    setConnectedIds((prev) => [...prev, builder.id]);
    toast(`Connection request sent to ${builder.name}!`);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Compass size={18} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Discover Teammates
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Find student builders, developers, and designers with explainable compatibility scores.
        </p>
      </div>

      {/* ── Filters & Search ──────────────────────────────────── */}
      <div className="card !p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill (e.g. React, Go, Figma), or topic..."
            className="input-field pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
                selectedRole === r
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Builders List ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((builder) => {
          const isConnected = connectedIds.includes(builder.id);
          return (
            <div
              key={builder.id}
              className="card !p-5 hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary font-black text-base flex items-center justify-center shrink-0">
                      {builder.avatar_initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">
                        {builder.name}
                      </h3>
                      <p className="text-xs font-semibold text-primary">{builder.role}</p>
                      <p className="text-[11px] text-gray-400">
                        {builder.university} • {builder.year}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {builder.compatibilityScore}% Match
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium mb-3">
                  {builder.headline}
                </p>

                {/* Explainable match breakdown */}
                <div className="p-2.5 rounded-xl bg-primary/[0.04] dark:bg-primary/[0.08] border border-primary/10 mb-3">
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">
                    <strong className="text-primary">Why compatible:</strong> {builder.matchReason}
                  </p>
                </div>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {builder.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {builder.availability}
                </span>

                <button
                  type="button"
                  onClick={() => handleConnect(builder)}
                  disabled={isConnected}
                  className={`btn-primary !py-1.5 !px-3 text-xs ${
                    isConnected ? "!bg-emerald-600 !opacity-100 cursor-default" : ""
                  }`}
                >
                  {isConnected ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Requested</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Connect</span>
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

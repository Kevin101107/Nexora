"use client";
const session = true;

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { ProjectListItem, ProjectRole } from "@/lib/types";
import {
  FolderGit2,
  Search,
  Plus,
  Users,
  Clock,
  Send,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";

const CATEGORIES = [
  { label: "All Categories", value: "all" },
  { label: "Hackathon Squads", value: "hackathon" },
  { label: "Side Projects", value: "side_project" },
  { label: "Research / Capstones", value: "research" },
  { label: "Startups", value: "startup" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [appliedRoleIds, setAppliedRoleIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Apply Modal state
  const [applyingProject, setApplyingProject] = useState<ProjectListItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [submittingApp, setSubmittingApp] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);

      const api = createApiClient(DEVELOPMENT_USER_ID);

      try {
        let path = "/projects?";
        if (selectedCategory !== "all") path += `category=${selectedCategory}&`;
        if (query.trim()) path += `q=${encodeURIComponent(query.trim())}&`;
        const res = await api.get<ProjectListItem[]>(path);
        setProjects(res || []);
      } catch (err: any) {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      loadProjects();
    }, 200);

    return () => clearTimeout(timer);
  }, [query, selectedCategory]);

  async function handleApplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!applyingProject) return;
    setSubmittingApp(true);
    try {

      if (!session) {
        toast("Please log in to apply", "error");
        setSubmittingApp(false);
        return;
      }
      const api = createApiClient(DEVELOPMENT_USER_ID);
      await api.post(`/projects/${applyingProject.id}/apply`, {
        role_id: selectedRole ? selectedRole.id : null,
        message: applyMessage.trim() || null,
      });

      if (selectedRole) {
        setAppliedRoleIds((prev) => [...prev, selectedRole.id]);
      }
      toast(`Application submitted to "${applyingProject.title}"!`);
      setApplyingProject(null);
      setSelectedRole(null);
      setApplyMessage("");
    } catch (err: any) {
      toast(err?.message || "Failed to submit application", "error");
    } finally {
      setSubmittingApp(false);
    }
  }

  const categoryLabels: Record<string, string> = {
    hackathon: "Hackathon Squad",
    side_project: "Side Project",
    research: "Research / Capstone",
    startup: "Startup Venture",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
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

        <Link
          href="/projects/new"
          className="btn-primary text-xs sm:text-sm !py-2 !px-4 self-start sm:self-auto flex items-center gap-1.5"
        >
          <Plus size={16} />
          <span>Post a Project</span>
        </Link>
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
              key={c.value}
              onClick={() => setSelectedCategory(c.value)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
                selectedCategory === c.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Projects Grid ─────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card !p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 flex items-center justify-center mx-auto">
            <FolderGit2 size={24} />
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            No projects found
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Try adjusting your search terms or category filter, or post the first project in this category!
          </p>
          <div className="pt-2">
            <Link href="/projects/new" className="btn-primary text-xs !py-2 !px-4">
              Post a Project
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => {
            const allSkills = Array.from(
              new Set(project.roles.flatMap((r) => r.required_skills))
            );

            return (
              <div
                key={project.id}
                className="card !p-5 hover:border-primary/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {categoryLabels[project.category] || project.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      <span>{project.open_roles_count} roles open</span>
                    </span>
                  </div>

                  <Link href={`/projects/${project.id}`}>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Open roles needed */}
                  {project.roles && project.roles.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Roles Needed:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.roles.map((role) => (
                          <span
                            key={role.id}
                            className="text-xs px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold"
                          >
                            {role.role_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills preview */}
                  {allSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {allSkills.slice(0, 6).map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Squad: {project.members_count} {project.members_count === 1 ? "builder" : "builders"}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="btn-outline !py-1.5 !px-3 text-xs"
                    >
                      Details
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setApplyingProject(project);
                        setSelectedRole(project.roles[0] || null);
                      }}
                      className="btn-primary !py-1.5 !px-3.5 text-xs flex items-center gap-1.5"
                    >
                      <Send size={13} />
                      <span>Apply</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Apply Modal */}
      {applyingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card !p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Apply to {applyingProject.title}
              </h3>
              <button
                type="button"
                onClick={() => setApplyingProject(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              {applyingProject.roles.length > 0 && (
                <div>
                  <label className="label">Select Role</label>
                  <select
                    value={selectedRole?.id || ""}
                    onChange={(e) => {
                      const r = applyingProject.roles.find((item) => item.id === e.target.value);
                      setSelectedRole(r || null);
                    }}
                    className="input-field text-xs"
                  >
                    {applyingProject.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.role_name} ({r.slots - r.filled_slots} spots left)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Message to Lead</label>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  rows={3}
                  className="input-field text-xs"
                  placeholder="Introduce yourself and share why you want to build this project..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyingProject(null)}
                  className="btn-outline text-xs !py-1.5 !px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApp}
                  className="btn-primary text-xs !py-1.5 !px-4"
                >
                  {submittingApp ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Send size={13} />
                      Submit Application
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

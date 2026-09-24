"use client";
const session = true;

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { ProjectListItem, ProjectRole } from "@/lib/types";
import Dialog from "@/components/ui/Dialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/DataStates";
import {
  FolderGit2,
  Search,
  Plus,
  Clock,
  Send,
  Loader2,
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
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [appliedRoleIds, setAppliedRoleIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Apply Modal state
  const [applyingProject, setApplyingProject] = useState<ProjectListItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [submittingApp, setSubmittingApp] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    const api = createApiClient(DEVELOPMENT_USER_ID);

    try {
      let path = "/projects?";
      if (selectedCategory !== "all") path += `category=${selectedCategory}&`;
      if (query.trim()) path += `q=${encodeURIComponent(query.trim())}&`;
      const res = await api.get<ProjectListItem[]>(path);
      setProjects(res || []);
    } catch (err: any) {
      setError("Unable to load projects. Please check your connection and try again.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [query, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProjects();
    }, 200);

    return () => clearTimeout(timer);
  }, [loadProjects]);

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
    <div className="max-w-6xl mx-auto space-y-6 pb-20 w-full min-w-0">
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
          className="btn-primary text-xs sm:text-sm !py-2 !px-4 self-start sm:self-auto flex items-center gap-1.5 shrink-0"
        >
          <Plus size={16} />
          <span>Post a Project</span>
        </Link>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="card !p-4 space-y-3">
        <div className="relative">
          <label htmlFor="projects-search-input" className="sr-only">
            Search projects by title, needed role, or tech stack
          </label>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="projects-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by project title, needed role, or tech stack..."
            className="input-field pl-10"
          />
        </div>

        <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 text-xs max-w-full">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
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

      {/* ── Projects Grid / States ────────────────────────────── */}
      {loading ? (
        <LoadingState message="Loading projects..." className="py-24" />
      ) : error ? (
        <ErrorState
          title="Unable to load projects"
          message={error}
          onRetry={loadProjects}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects found"
          message="Try adjusting your search terms or category filter, or post the first project in this category!"
          action={{
            label: "Post a Project",
            href: "/projects/new",
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => {
            const allSkills = Array.from(
              new Set(project.roles.flatMap((r) => r.required_skills))
            );

            // True availability derived from role slots
            const hasOpenRoles =
              project.open_roles_count > 0 &&
              project.roles.some((r) => r.slots - r.filled_slots > 0);

            return (
              <div
                key={project.id}
                className="card !p-5 hover:border-primary/40 transition-all flex flex-col justify-between group min-w-0"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {categoryLabels[project.category] || project.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 shrink-0">
                      <Clock size={12} />
                      <span>
                        {hasOpenRoles
                          ? `${project.open_roles_count} ${project.open_roles_count === 1 ? "role" : "roles"} open`
                          : "No open roles"}
                      </span>
                    </span>
                  </div>

                  <Link href={`/projects/${project.id}`}>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary transition-colors break-words">
                      {project.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-3 leading-relaxed break-words">
                    {project.description}
                  </p>

                  {/* Open roles needed */}
                  {project.roles && project.roles.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Roles Needed:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.roles.map((role) => {
                          const isRoleFull = role.slots - role.filled_slots <= 0;
                          return (
                            <span
                              key={role.id}
                              className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                                isRoleFull
                                  ? "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400"
                                  : "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              }`}
                            >
                              {role.role_name}
                              {isRoleFull && " (Full)"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Skills preview */}
                  {allSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {allSkills.slice(0, 6).map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 font-medium truncate max-w-[140px]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
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

                    {hasOpenRoles ? (
                      <button
                        type="button"
                        onClick={() => {
                          setApplyingProject(project);
                          const firstOpenRole =
                            project.roles.find((r) => r.slots - r.filled_slots > 0) ||
                            project.roles[0] ||
                            null;
                          setSelectedRole(firstOpenRole);
                        }}
                        className="btn-primary !py-1.5 !px-3.5 text-xs flex items-center gap-1.5"
                      >
                        <Send size={13} />
                        <span>Apply</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="All roles in this project are filled"
                        className="btn-outline !py-1.5 !px-3 text-xs opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500"
                      >
                        <span>No open roles</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accessible Quick Apply Dialog */}
      <Dialog
        isOpen={!!applyingProject}
        onClose={() => setApplyingProject(null)}
        title={applyingProject ? `Apply to ${applyingProject.title}` : "Apply to Project"}
        description="Select an open role and share a brief note on why you'd like to join."
      >
        {applyingProject && (
          <form onSubmit={handleApplySubmit} className="space-y-4">
            {applyingProject.roles.length > 0 && (
              <div>
                <label htmlFor="apply-role-select" className="label">
                  Select Role
                </label>
                <select
                  id="apply-role-select"
                  value={selectedRole?.id || ""}
                  onChange={(e) => {
                    const r = applyingProject.roles.find((item) => item.id === e.target.value);
                    setSelectedRole(r || null);
                  }}
                  className="input-field text-xs"
                >
                  {applyingProject.roles.map((r) => {
                    const spotsLeft = r.slots - r.filled_slots;
                    return (
                      <option key={r.id} value={r.id} disabled={spotsLeft <= 0}>
                        {r.role_name} ({spotsLeft > 0 ? `${spotsLeft} spots left` : "Filled"})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="apply-message-input" className="label">
                Message to Lead
              </label>
              <textarea
                id="apply-message-input"
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                rows={3}
                className="input-field text-xs"
                placeholder="Introduce yourself and share why you want to build this project..."
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
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
        )}
      </Dialog>
    </div>
  );
}

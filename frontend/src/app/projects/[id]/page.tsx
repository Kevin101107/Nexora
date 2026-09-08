"use client";
const session = true;

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { Project, ProjectRole, ProjectApplication, RoleCandidateMatch, PublicUserProfile } from "@/lib/types";
import MatchScoreBadge from "@/components/MatchScoreBadge";
import {
  FolderGit2,
  Users,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowLeft,
  Loader2,
  Edit3,
  Trash2,
  X,
  ExternalLink,
  ShieldCheck,
  Award,
  Sparkles,
} from "lucide-react";

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = params.id;
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Application Modal state
  const [selectedRole, setSelectedRole] = useState<ProjectRole | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [submittingApp, setSubmittingApp] = useState(false);
  const [appliedRoleIds, setAppliedRoleIds] = useState<string[]>([]);

  // Owner controls state
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleSkills, setNewRoleSkills] = useState("");
  const [newRoleSlots, setNewRoleSlots] = useState(1);
  const [addingRole, setAddingRole] = useState(false);

  // Edit Project state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Find Matches state
  const [matchingRole, setMatchingRole] = useState<ProjectRole | null>(null);
  const [isFindMatchesModalOpen, setIsFindMatchesModalOpen] = useState(false);
  const [roleCandidates, setRoleCandidates] = useState<RoleCandidateMatch[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);

  async function handleOpenFindMatches(role: ProjectRole) {
    setMatchingRole(role);
    setIsFindMatchesModalOpen(true);
    setLoadingCandidates(true);
    try {

      const api = createApiClient(DEVELOPMENT_USER_ID);
      const res = await api.get<RoleCandidateMatch[]>(
        `/projects/${projectId}/roles/${role.id}/matches?limit=20`
      );
      setRoleCandidates(res || []);
    } catch (err: any) {
      toast("Failed to load candidate matches", "error");
      setRoleCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function handleInviteCandidate(user: PublicUserProfile, role: ProjectRole) {
    try {

      if (!session) {
        toast("Please log in to invite candidates", "error");
        return;
      }
      const api = createApiClient(DEVELOPMENT_USER_ID);
      await api.post("/requests", {
        receiver_id: user.id,
        project_id: projectId,
        message: `Hi ${user.display_name || user.username}! We saw your profile and would love to invite you to join our squad as a ${role.role_name} on "${project?.title}".`,
      });
      setInvitedUserIds((prev) => [...prev, user.id]);
      toast(`Invitation sent to ${user.display_name || user.username}!`);
    } catch (err: any) {
      toast(err?.message || "Failed to send invitation", "error");
    }
  }

  const loadProject = useCallback(async () => {

    if (session) {
      setCurrentUserId(DEVELOPMENT_USER_ID);
    }
    const api = createApiClient(DEVELOPMENT_USER_ID);
    try {
      const p = await api.get<Project>(`/projects/${projectId}`);
      setProject(p);
      setEditTitle(p.title);
      setEditDesc(p.description);
      setEditCategory(p.category);
      setEditStatus(p.status);

      // If user is owner, load applications
      if (session && p.owner_id === DEVELOPMENT_USER_ID) {
        setLoadingApps(true);
        const apps = await api.get<ProjectApplication[]>(`/projects/${projectId}/applications`).catch(() => []);
        setApplications(apps);
        setLoadingApps(false);
      }
    } catch (err: any) {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const isOwner = currentUserId && project && currentUserId === project.owner_id;
  const isMember = currentUserId && project && project.members.some((m) => m.user_id === currentUserId);

  // Apply handler
  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setSubmittingApp(true);
    try {

      if (!session) {
        toast("Please log in to apply", "error");
        setSubmittingApp(false);
        return;
      }
      const api = createApiClient(DEVELOPMENT_USER_ID);
      await api.post(`/projects/${projectId}/apply`, {
        role_id: selectedRole ? selectedRole.id : null,
        message: applyMessage.trim() || null,
      });
      if (selectedRole) {
        setAppliedRoleIds((prev) => [...prev, selectedRole.id]);
      }
      toast(`Application submitted for ${selectedRole ? selectedRole.role_name : "this project"}!`);
      setIsApplyModalOpen(false);
      setApplyMessage("");
    } catch (err: any) {
      toast(err?.message || "Failed to submit application", "error");
    } finally {
      setSubmittingApp(false);
    }
  }

  // Owner Application Decision handler
  async function handleApplicationDecision(appId: string, action: "accepted" | "rejected") {
    try {

      if (!session) return;
      const api = createApiClient(DEVELOPMENT_USER_ID);
      await api.post(`/applications/${appId}/respond`, { action });
      toast(`Application ${action}!`);
      loadProject();
    } catch (err: any) {
      toast(err?.message || "Failed to respond to application", "error");
    }
  }

  // Add Role handler
  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    try {

      if (!session) return;
      const api = createApiClient(DEVELOPMENT_USER_ID);
      const skillsArray = newRoleSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await api.post(`/projects/${projectId}/roles`, {
        role_name: newRoleName.trim(),
        description: newRoleDesc.trim() || null,
        required_skills: skillsArray,
        slots: Number(newRoleSlots) || 1,
      });

      toast("New role created!");
      setIsAddRoleModalOpen(false);
      setNewRoleName("");
      setNewRoleDesc("");
      setNewRoleSkills("");
      setNewRoleSlots(1);
      loadProject();
    } catch (err: any) {
      toast(err?.message || "Failed to add role", "error");
    } finally {
      setAddingRole(false);
    }
  }

  // Edit Project handler
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    try {

      if (!session) return;
      const api = createApiClient(DEVELOPMENT_USER_ID);

      await api.patch(`/projects/${projectId}`, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory,
        status: editStatus,
      });

      toast("Project updated!");
      setIsEditModalOpen(false);
      loadProject();
    } catch (err: any) {
      toast(err?.message || "Failed to update project", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  // Delete Project handler
  async function handleDeleteProject() {
    if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;
    try {

      if (!session) return;
      const api = createApiClient(DEVELOPMENT_USER_ID);
      await api.delete(`/projects/${projectId}`);
      toast("Project deleted successfully");
      router.push("/projects");
    } catch (err: any) {
      toast(err?.message || "Failed to delete project", "error");
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 flex items-center justify-center mx-auto">
          <FolderGit2 size={28} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Project Not Found</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          This project may be private, or has been removed by its creator.
        </p>
        <Link href="/projects" className="btn-primary text-xs !py-2 !px-4">
          Back to Projects
        </Link>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    hackathon: "Hackathon Squad",
    side_project: "Side Project",
    research: "Research / Capstone",
    startup: "Startup Venture",
  };

  const statusColors: Record<string, string> = {
    recruiting: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    active: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
    completed: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20",
    archived: "bg-gray-100 dark:bg-white/[0.05] text-gray-500 border-gray-200 dark:border-white/[0.08]",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Projects</span>
        </Link>

        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="btn-outline text-xs !py-1.5 !px-3 flex items-center gap-1"
            >
              <Edit3 size={13} />
              <span>Edit Project</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteProject}
              className="btn-outline text-xs !py-1.5 !px-3 text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Project Banner & Overview */}
      <div className="card !p-6 sm:!p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {categoryLabels[project.category] || project.category}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border capitalize ${
                  statusColors[project.status] || statusColors.recruiting
                }`}
              >
                {project.status}
              </span>
              {project.visibility === "private" && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Private
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {project.title}
            </h1>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs text-gray-400 flex items-center sm:justify-end gap-1">
              <Clock size={12} />
              <span>{project.open_roles_count} roles open</span>
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {project.description}
        </p>

        {/* Owner Info */}
        <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-black text-xs">
              {project.owner?.display_name?.charAt(0).toUpperCase() || "O"}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                Project Owner: {project.owner?.display_name || "Builder"}
              </p>
              {project.owner?.username && (
                <Link
                  href={`/profile/${project.owner.username}`}
                  className="text-[11px] text-primary hover:underline"
                >
                  @{project.owner.username}
                </Link>
              )}
            </div>
          </div>

          {!isOwner && !isMember && (
            <button
              type="button"
              onClick={() => {
                setSelectedRole(null);
                setIsApplyModalOpen(true);
              }}
              className="btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5"
            >
              <Send size={13} />
              <span>Apply to Join</span>
            </button>
          )}

          {isMember && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              You are on this squad
            </span>
          )}
        </div>
      </div>

      {/* Squad Roster */}
      <div className="card !p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Squad Roster ({project.members_count})
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {project.members.map((member) => {
            const memberName = member.user?.display_name || member.user?.username || "Builder";
            const initial = memberName.charAt(0).toUpperCase();
            return (
              <div
                key={member.id}
                className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {memberName}
                    </p>
                    {member.member_role === "Owner" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Lead
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">
                    {member.role_name || (member.member_role === "Owner" ? "Founder" : "Collaborator")}
                  </p>
                </div>
                {member.user?.username && (
                  <Link
                    href={`/profile/${member.user.username}`}
                    className="text-gray-400 hover:text-primary transition-colors shrink-0"
                    title="View profile"
                  >
                    <ExternalLink size={13} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Open Roles */}
      <div className="card !p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Open Roles Needed
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Specific positions and skills needed to complete the squad.
            </p>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => setIsAddRoleModalOpen(true)}
              className="btn-outline text-xs !py-1.5 !px-3 flex items-center gap-1"
            >
              <Plus size={13} />
              <span>Add Role</span>
            </button>
          )}
        </div>

        {project.roles.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">
            No specific roles listed yet. General applications are accepted.
          </div>
        ) : (
          <div className="space-y-3">
            {project.roles.map((role) => {
              const slotsLeft = role.slots - role.filled_slots;
              const isFilled = slotsLeft <= 0 || role.status === "filled";
              const isApplied = appliedRoleIds.includes(role.id);

              return (
                <div
                  key={role.id}
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        {role.role_name}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isFilled
                            ? "bg-gray-200 dark:bg-white/10 text-gray-500"
                            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isFilled ? "Filled" : `${slotsLeft} of ${role.slots} spots available`}
                      </span>
                    </div>

                    {role.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {role.description}
                      </p>
                    )}

                    {role.required_skills && role.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {role.required_skills.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {isOwner && !isFilled && (
                      <button
                        type="button"
                        onClick={() => handleOpenFindMatches(role)}
                        className="btn-outline text-xs !py-1.5 !px-3 flex items-center gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                      >
                        <Sparkles size={13} className="text-primary" />
                        <span>Find Matches</span>
                      </button>
                    )}

                    {!isOwner && !isMember && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRole(role);
                          setIsApplyModalOpen(true);
                        }}
                        disabled={isFilled || isApplied}
                        className={`btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 ${
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
                            <span>Apply</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Owner Applications Management Section */}
      {isOwner && (
        <div className="card !p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Project Applications ({applications.filter((a) => a.status === "pending").length} Pending)
            </h2>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              No applications submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const applicantName =
                  app.applicant?.display_name || app.applicant?.username || "Applicant";
                const isPending = app.status === "pending";

                return (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                          {applicantName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {applicantName}
                            </span>
                            {app.applicant?.username && (
                              <Link
                                href={`/profile/${app.applicant.username}`}
                                className="text-[11px] text-primary hover:underline"
                              >
                                @{app.applicant.username}
                              </Link>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400">
                            Applying for:{" "}
                            <strong className="text-gray-700 dark:text-gray-300">
                              {app.role_name || "General Member"}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full self-start sm:self-center capitalize ${
                          app.status === "accepted"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                            : app.status === "rejected"
                            ? "bg-red-50 dark:bg-red-500/10 text-red-600"
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    {app.message && (
                      <div className="p-3 rounded-xl bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.04] text-xs text-gray-700 dark:text-gray-300">
                        {app.message}
                      </div>
                    )}

                    {isPending && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleApplicationDecision(app.id, "rejected")}
                          className="btn-outline !py-1 !px-3 text-xs text-red-500 hover:text-red-600"
                        >
                          <XCircle size={13} />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplicationDecision(app.id, "accepted")}
                          className="btn-primary !py-1 !px-3 text-xs"
                        >
                          <CheckCircle2 size={13} />
                          <span>Accept to Squad</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card !p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Apply for {selectedRole ? selectedRole.role_name : project.title}
              </h3>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="label">Note to Project Owner</label>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  rows={3}
                  className="input-field text-xs"
                  placeholder="Tell the team lead about your relevant experience, stack familiarity, and why you're excited to collaborate..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
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

      {/* Add Role Modal */}
      {isAddRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card !p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Add Role to Squad
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRoleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddRole} className="space-y-4">
              <div>
                <label className="label">Role Title</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="input-field text-xs"
                  placeholder="e.g. Backend Engineer / Go"
                  required
                />
              </div>

              <div>
                <label className="label">Slots Needed</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={newRoleSlots}
                  onChange={(e) => setNewRoleSlots(parseInt(e.target.value) || 1)}
                  className="input-field text-xs"
                  required
                />
              </div>

              <div>
                <label className="label">Description (Optional)</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="input-field text-xs"
                  placeholder="e.g. Architect high-throughput REST APIs"
                />
              </div>

              <div>
                <label className="label">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  value={newRoleSkills}
                  onChange={(e) => setNewRoleSkills(e.target.value)}
                  className="input-field text-xs"
                  placeholder="e.g. Go, Docker, Redis"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoleModalOpen(false)}
                  className="btn-outline text-xs !py-1.5 !px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingRole}
                  className="btn-primary text-xs !py-1.5 !px-4"
                >
                  {addingRole ? "Adding..." : "Add Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card !p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Edit Project
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input-field text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="hackathon">Hackathon Squad</option>
                    <option value="side_project">Side Project</option>
                    <option value="research">Research / Capstone</option>
                    <option value="startup">Startup Venture</option>
                  </select>
                </div>

                <div>
                  <label className="label">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="recruiting">Recruiting</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="input-field text-xs resize-y"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn-outline text-xs !py-1.5 !px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-primary text-xs !py-1.5 !px-4"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Find Matches Modal */}
      {isFindMatchesModalOpen && matchingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card !p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Candidate Matches for {matchingRole.role_name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Ranked by deterministic Match Score V1 (skills, role alignment, availability).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsFindMatchesModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X size={16} />
              </button>
            </div>

            {loadingCandidates ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span>Calculating candidate scores...</span>
              </div>
            ) : roleCandidates.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 space-y-1">
                <p className="font-semibold text-gray-600 dark:text-gray-300">No candidates available</p>
                <p>All candidates are already members of this project or no public builders match.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roleCandidates.map((candidate, idx) => {
                  const candidateName =
                    candidate.user.display_name || candidate.user.username || "Builder";
                  const initial = candidateName.charAt(0).toUpperCase();
                  const isInvited = invitedUserIds.includes(candidate.user.id);

                  return (
                    <div
                      key={candidate.user.id}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-gray-400 w-4">
                            #{idx + 1}
                          </span>
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                {candidateName}
                              </h4>
                              {candidate.user.username && (
                                <Link
                                  href={`/profile/${candidate.user.username}`}
                                  target="_blank"
                                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                                >
                                  @{candidate.user.username}
                                  <ExternalLink size={10} />
                                </Link>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                              {candidate.user.headline || "Student Builder"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleInviteCandidate(candidate.user, matchingRole)}
                            disabled={isInvited}
                            className={`btn-primary !py-1.5 !px-3.5 text-xs flex items-center gap-1.5 ${
                              isInvited ? "!bg-emerald-600 !opacity-100 cursor-default" : ""
                            }`}
                          >
                            {isInvited ? (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Invited</span>
                              </>
                            ) : (
                              <>
                                <Send size={13} />
                                <span>Invite to Squad</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Explainable Match Badge */}
                      <MatchScoreBadge match={candidate.match} showDetails={true} />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsFindMatchesModalOpen(false)}
                className="btn-outline text-xs !py-1.5 !px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

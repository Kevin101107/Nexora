"use client";
const session = true;

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import {
  PublicUserProfile,
  ProjectListItem,
  MatchScoreResult,
  UserRoleMatchResponse,
} from "@/lib/types";
import MatchScoreBadge from "@/components/MatchScoreBadge";
import {
  User,
  Loader2,
  ArrowLeft,
  Github,
  Linkedin,
  Send,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  ShieldCheck,
  FolderGit2,
  Users,
} from "lucide-react";

export default function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const username = params.username;
  const { toast } = useToast();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectMessage, setConnectMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Projects owned by viewer
  const [myOwnedProjects, setMyOwnedProjects] = useState<ProjectListItem[]>([]);
  const [inviteType, setInviteType] = useState<"general" | "project">("general");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [matchPreview, setMatchPreview] = useState<MatchScoreResult | null>(null);
  const [loadingMatchPreview, setLoadingMatchPreview] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      if (session) {
        setCurrentUserId(DEVELOPMENT_USER_ID);
      }

      const api = createApiClient(DEVELOPMENT_USER_ID);
      try {
        const [p, projs] = await Promise.all([
          api.get<PublicUserProfile>(`/users/${username}`),
          api.get<ProjectListItem[]>("/projects").catch(() => []),
        ]);
        setProfile(p);
        const owned = (projs || []).filter((item) => item.owner_id === DEVELOPMENT_USER_ID);
        setMyOwnedProjects(owned);
      } catch (err: any) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  async function fetchMatchPreview(userId: string, roleId: string) {
    setLoadingMatchPreview(true);
    try {
      const api = createApiClient(DEVELOPMENT_USER_ID);
      const res = await api.get<UserRoleMatchResponse>(`/matches/users/${userId}/roles/${roleId}`);
      if (res && res.match) {
        setMatchPreview(res.match);
      } else {
        setMatchPreview(null);
      }
    } catch {
      setMatchPreview(null);
    } finally {
      setLoadingMatchPreview(false);
    }
  }

  function handleOpenModal() {
    setIsConnectModalOpen(true);
    setConnectMessage("");
    setMatchPreview(null);

    const projectsWithRoles = myOwnedProjects.filter(
      (p) => p.roles && p.roles.some((r) => r.status === "open" && r.filled_slots < r.slots)
    );

    if (projectsWithRoles.length > 0 && profile) {
      setInviteType("project");
      const firstProj = projectsWithRoles[0];
      setSelectedProjectId(firstProj.id);
      const openRoles = firstProj.roles.filter((r) => r.status === "open" && r.filled_slots < r.slots);
      if (openRoles.length > 0) {
        setSelectedRoleId(openRoles[0].id);
        fetchMatchPreview(profile.id, openRoles[0].id);
      } else {
        setSelectedRoleId("");
      }
    } else {
      setInviteType("general");
      setSelectedProjectId("");
      setSelectedRoleId("");
    }
  }

  function handleProjectChange(projId: string) {
    setSelectedProjectId(projId);
    const proj = myOwnedProjects.find((p) => p.id === projId);
    const openRoles = proj?.roles.filter((r) => r.status === "open" && r.filled_slots < r.slots) || [];
    if (openRoles.length > 0 && profile) {
      setSelectedRoleId(openRoles[0].id);
      fetchMatchPreview(profile.id, openRoles[0].id);
    } else {
      setSelectedRoleId("");
      setMatchPreview(null);
    }
  }

  function handleRoleChange(roleId: string) {
    setSelectedRoleId(roleId);
    if (profile && roleId) {
      fetchMatchPreview(profile.id, roleId);
    } else {
      setMatchPreview(null);
    }
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSendingRequest(true);
    try {
      if (!session) {
        toast("Please log in to send teammate requests", "error");
        setSendingRequest(false);
        return;
      }
      const api = createApiClient(DEVELOPMENT_USER_ID);

      const payload: any = {
        receiver_id: profile.id,
        message: connectMessage.trim() || null,
      };

      if (inviteType === "project" && selectedProjectId) {
        payload.project_id = selectedProjectId;
        if (selectedRoleId) {
          payload.role_id = selectedRoleId;
        }
      }

      await api.post("/requests", payload);
      setRequestSent(true);
      setIsConnectModalOpen(false);
      toast(`Teammate request sent to ${profile.display_name || profile.username}!`);
    } catch (err: any) {
      toast(err?.message || "Failed to send request", "error");
    } finally {
      setSendingRequest(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 flex items-center justify-center mx-auto">
          <User size={28} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Builder Not Found</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          We couldn&apos;t find any builder profile matching @{username}.
        </p>
        <div>
          <Link href="/discover" className="btn-primary text-xs !py-2 !px-4">
            Explore All Builders
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || "Builder";
  const initial = displayName.charAt(0).toUpperCase();
  const isOwnProfile = currentUserId === profile.id;

  const availabilityLabels: Record<string, { label: string; color: string }> = {
    open: { label: "Open to Collaborations", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
    looking_for_hackathon: { label: "Looking for Hackathon Squad", color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
    looking_for_project: { label: "Looking for Side Project", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
    busy: { label: "Currently Busy", color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
  };

  const avail = availabilityLabels[profile.availability || "open"] || availabilityLabels.open;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Discover</span>
        </Link>
      </div>

      {/* Main Builder Card */}
      <div className="card !p-6 sm:!p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 rounded-3xl bg-primary/15 text-primary flex items-center justify-center text-3xl font-black shrink-0 shadow-inner">
            {initial}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                  {displayName}
                </h1>
                {profile.username && (
                  <p className="text-xs font-semibold text-primary">
                    @{profile.username}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-center sm:self-start">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full border ${avail.color}`}
                >
                  {avail.label}
                </span>

                {!isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleOpenModal}
                    disabled={requestSent}
                    className={`btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 ${
                      requestSent ? "!bg-emerald-600 !opacity-100 cursor-default" : ""
                    }`}
                  >
                    {requestSent ? (
                      <>
                        <CheckCircle2 size={13} />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Invite / Connect</span>
                      </>
                    )}
                  </button>
                )}

                {isOwnProfile && (
                  <Link
                    href="/profile/edit"
                    className="btn-outline text-xs !py-1.5 !px-3"
                  >
                    Edit My Profile
                  </Link>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 font-medium">
              {profile.headline || "Student Builder on Nexora"}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Github size={13} /> GitHub Profile
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Linkedin size={13} /> LinkedIn Profile
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              About
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Roles */}
        {profile.roles && profile.roles.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Primary Roles
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.roles.map((r) => (
                <span
                  key={r}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Technical Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Tech Stack & Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span
                  key={s}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.05] text-gray-800 dark:text-gray-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Interests & Domains
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((item) => (
                <span
                  key={item}
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connect / Invite Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card !p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.06]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Invite {displayName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Collaborate on your squad or connect for future projects.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Invite Type Switcher if user has projects */}
            {myOwnedProjects.length > 0 && (
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/[0.05] rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setInviteType("project")}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    inviteType === "project"
                      ? "bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <FolderGit2 size={13} className="text-primary" />
                  <span>Invite to Project Squad</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInviteType("general");
                    setMatchPreview(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    inviteType === "general"
                      ? "bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Users size={13} />
                  <span>Direct Connection</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSendRequest} className="space-y-4">
              {inviteType === "project" && myOwnedProjects.length > 0 && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                  <div>
                    <label className="label">Select Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      className="input-field text-xs"
                    >
                      {myOwnedProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.open_roles_count} open {p.open_roles_count === 1 ? "role" : "roles"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const currentProj = myOwnedProjects.find((p) => p.id === selectedProjectId);
                    const openRoles =
                      currentProj?.roles.filter((r) => r.status === "open" && r.filled_slots < r.slots) || [];

                    if (openRoles.length === 0) {
                      return (
                        <p className="text-xs text-amber-500">
                          This project has no open roles. You can still send a general project invite.
                        </p>
                      );
                    }

                    return (
                      <div>
                        <label className="label">Target Role</label>
                        <select
                          value={selectedRoleId}
                          onChange={(e) => handleRoleChange(e.target.value)}
                          className="input-field text-xs"
                        >
                          <option value="">General Member (No specific role)</option>
                          {openRoles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.role_name} ({r.slots - r.filled_slots} spots left)
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  {/* Match Preview */}
                  {loadingMatchPreview ? (
                    <div className="py-2 flex items-center justify-center gap-2 text-xs text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Checking role match score...</span>
                    </div>
                  ) : matchPreview ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Compatibility Preview:
                      </p>
                      <MatchScoreBadge match={matchPreview} showDetails={false} />
                    </div>
                  ) : null}
                </div>
              )}

              <div>
                <label className="label">Personalized Note</label>
                <textarea
                  value={connectMessage}
                  onChange={(e) => setConnectMessage(e.target.value)}
                  rows={3}
                  className="input-field text-xs"
                  placeholder={
                    inviteType === "project"
                      ? "Tell the builder why they'd be a great fit for your squad..."
                      : "Introduce yourself and what kind of projects or hackathons you want to build together..."
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="btn-outline text-xs !py-1.5 !px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingRequest}
                  className="btn-primary text-xs !py-1.5 !px-4"
                >
                  {sendingRequest ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Send size={13} />
                      Send Invitation
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

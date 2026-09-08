"use client";
const session = true;

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { UserProfileRead } from "@/lib/types";
import {
  User,
  Loader2,
  Edit3,
  ExternalLink,
  Mail,
  Github,
  Linkedin,
  Clock,
  Sparkles,
  Code2,
  Compass,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileRead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      if (session) {
        const api = createApiClient(DEVELOPMENT_USER_ID);
        const p = await api.get<UserProfileRead>("/users/me").catch(() => null);
        if (p) setProfile(p);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.display_name || "Builder";
  const username = profile?.username;
  const initial = displayName.charAt(0).toUpperCase();

  const availabilityLabels: Record<string, { label: string; color: string }> = {
    open: { label: "Open to Collaborations", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
    looking_for_hackathon: { label: "Looking for Hackathon Squad", color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
    looking_for_project: { label: "Looking for Side Project", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
    busy: { label: "Currently Busy", color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
  };

  const avail = availabilityLabels[profile?.availability || "open"] || availabilityLabels.open;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            My Builder Profile
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            How other student builders and project owners see you on Nexora.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {username && (
            <Link
              href={`/profile/${username}`}
              className="btn-outline text-xs !py-2 !px-3 flex items-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Public View</span>
            </Link>
          )}
          <Link
            href="/profile/edit"
            className="btn-primary text-xs !py-2 !px-3.5 flex items-center gap-1.5"
          >
            <Edit3 size={13} />
            <span>Edit Profile</span>
          </Link>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="card !p-6 sm:!p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 rounded-3xl bg-primary/15 text-primary flex items-center justify-center text-3xl font-black shrink-0 shadow-inner">
            {initial}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {displayName}
                </h2>
                {username && (
                  <p className="text-xs font-semibold text-primary">
                    @{username}
                  </p>
                )}
              </div>

              <span
                className={`self-center sm:self-start text-xs font-semibold px-3 py-1 rounded-full border ${avail.color}`}
              >
                {avail.label}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 font-medium">
              {profile?.headline || "No headline set yet. Tell prospective teammates what you build!"}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Mail size={13} /> {profile?.email} (private)
              </span>
              {profile?.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Github size={13} /> GitHub
                </a>
              )}
              {profile?.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Linkedin size={13} /> LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              About & Background
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Roles */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Primary Roles
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile?.roles && profile.roles.length > 0 ? (
              profile.roles.map((r) => (
                <span
                  key={r}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20"
                >
                  {r}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">No roles selected yet.</span>
            )}
          </div>
        </div>

        {/* Technical Skills */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Technical Stack & Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile?.skills && profile.skills.length > 0 ? (
              profile.skills.map((s) => (
                <span
                  key={s}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.05] text-gray-800 dark:text-gray-200"
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">No skills listed yet.</span>
            )}
          </div>
        </div>

        {/* Interests */}
        {profile?.interests && profile.interests.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Interests & Domains
            </h3>
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
    </div>
  );
}

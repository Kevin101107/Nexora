"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { User, Loader2, Save, ShieldCheck, Mail, Sparkles } from "lucide-react";

interface ProfileData {
  id: string;
  email: string;
  display_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  skills?: string[];
  roles?: string[];
  availability?: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const api = createApiClient(session.access_token);
        const p = await api.get<ProfileData>("/users/me").catch(() => null);
        if (p) {
          setProfile(p);
          setName(p.display_name || "");
          setHeadline(p.headline || "");
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast("Not authenticated", "error");
        setSaving(false);
        return;
      }
      const api = createApiClient(session.access_token);
      const updated = await api.put<ProfileData>("/users/me", {
        display_name: name.trim() || null,
        headline: headline.trim() || null,
      });
      if (updated) {
        setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      }
      toast("Profile updated successfully!");
    } catch (err: any) {
      toast(err?.message || "Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const nameInitial = name
    ? name.charAt(0).toUpperCase()
    : profile?.email
    ? profile.email.charAt(0).toUpperCase()
    : "B";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Builder Profile
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Your profile helps potential teammates understand your technical skills and background.
        </p>
      </div>

      {/* Profile Card Header */}
      <div className="card !p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-3xl bg-primary/15 text-primary flex items-center justify-center text-3xl font-black shrink-0">
          {nameInitial}
        </div>
        <div className="text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {name || "Student Builder"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                <Mail size={12} /> {profile?.email}
              </p>
            </div>
            <span className="self-center sm:self-start text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              Open to Teams
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 font-medium">
            {headline || "No headline set yet. Tell teammates what you build!"}
          </p>
        </div>
      </div>

      {/* Basic Profile Form */}
      <div className="card !p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          Edit Profile Information
        </h3>

        <div>
          <label className="label">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="e.g. Alex Chen"
          />
        </div>

        <div>
          <label className="label">Role / Headline</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="input-field"
            placeholder="e.g. Full-Stack Developer | React & FastAPI"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            A short one-liner shown on teammate discover cards.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
          <p className="text-xs font-bold text-gray-900 dark:text-white">
            Looking for structured skill tags & portfolio links?
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            The full structured builder profile editor (verified GitHub repos, tech stack tags, role preferences, and hackathon history) is coming in Phase 2.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary w-full justify-center text-sm font-bold"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save size={16} />
                Save Profile
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

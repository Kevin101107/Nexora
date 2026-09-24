"use client";
const session = true;

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { Project } from "@/lib/types";
import {
  FolderGit2,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";

interface RoleInput {
  role_name: string;
  description: string;
  required_skills: string[];
  slots: number;
  skillInput: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("hackathon");
  const [visibility, setVisibility] = useState("public");

  const [roles, setRoles] = useState<RoleInput[]>([
    {
      role_name: "Frontend Engineer",
      description: "Build user-facing interfaces with responsive design",
      required_skills: ["React", "Tailwind CSS"],
      slots: 1,
      skillInput: "",
    },
  ]);

  function handleAddRole() {
    setRoles((prev) => [
      ...prev,
      {
        role_name: "",
        description: "",
        required_skills: [],
        slots: 1,
        skillInput: "",
      },
    ]);
  }

  function handleRemoveRole(idx: number) {
    setRoles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleRoleChange(idx: number, field: keyof RoleInput, val: any) {
    setRoles((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    );
  }

  function handleAddRoleSkill(idx: number) {
    const r = roles[idx];
    const s = r.skillInput.trim();
    if (s && !r.required_skills.includes(s)) {
      handleRoleChange(idx, "required_skills", [...r.required_skills, s]);
      handleRoleChange(idx, "skillInput", "");
    }
  }

  function handleRemoveRoleSkill(roleIdx: number, skillName: string) {
    const r = roles[roleIdx];
    handleRoleChange(
      roleIdx,
      "required_skills",
      r.required_skills.filter((s) => s !== skillName)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast("Please provide both title and description", "error");
      return;
    }

    setSubmitting(true);
    try {

      if (!session) {
        toast("Please log in to post a project", "error");
        setSubmitting(false);
        return;
      }

      const api = createApiClient(DEVELOPMENT_USER_ID);

      const rolesPayload = roles
        .filter((r) => r.role_name.trim())
        .map((r) => ({
          role_name: r.role_name.trim(),
          description: r.description.trim() || null,
          required_skills: r.required_skills,
          slots: Number(r.slots) || 1,
        }));

      const newProj = await api.post<Project>("/projects", {
        title: title.trim(),
        description: description.trim(),
        category,
        visibility,
        roles: rolesPayload,
      });

      toast("Project created successfully!");
      router.push(`/projects/${newProj.id}`);
    } catch (err: any) {
      toast(err?.message || "Failed to create project", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Projects</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Post a Project
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Form a squad for an upcoming hackathon, launch a side project, or assemble research contributors.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Details */}
        <div className="card !p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Project Overview
          </h2>

          <div>
            <label className="label">Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g. Campus Pulse Radar"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
              >
                <option value="hackathon">Hackathon Squad</option>
                <option value="side_project">Side Project</option>
                <option value="research">Research / Capstone</option>
                <option value="startup">Startup Venture</option>
              </select>
            </div>

            <div>
              <label className="label">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="input-field"
              >
                <option value="public">Public (Visible on Explore Projects)</option>
                <option value="private">Private (Invite only)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description & Goals</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="input-field resize-y"
              placeholder="Describe the problem, the tech stack you're planning to use, and what kind of commitment you're looking for..."
              required
            />
          </div>
        </div>

        {/* Roles Needed */}
        <div className="card !p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Open Roles Needed
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Define the specific skills and spots you want to recruit.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddRole}
              className="btn-outline text-xs !py-1.5 !px-3 flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Role</span>
            </button>
          </div>

          <div className="space-y-4">
            {roles.map((role, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-primary">
                    Role #{idx + 1}
                  </span>

                  {roles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(idx)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="label">Role Title</label>
                    <input
                      type="text"
                      value={role.role_name}
                      onChange={(e) => handleRoleChange(idx, "role_name", e.target.value)}
                      className="input-field text-xs"
                      placeholder="e.g. Mobile Developer / React Native"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Available Slots</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={role.slots}
                      onChange={(e) => handleRoleChange(idx, "slots", parseInt(e.target.value) || 1)}
                      className="input-field text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Responsibilities (Optional)</label>
                  <input
                    type="text"
                    value={role.description}
                    onChange={(e) => handleRoleChange(idx, "description", e.target.value)}
                    className="input-field text-xs"
                    placeholder="e.g. Build iOS/Android clients, integrate REST APIs"
                  />
                </div>

                <div>
                  <label className="label">Required Skills</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {role.required_skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => handleRemoveRoleSkill(idx, s)}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={role.skillInput}
                      onChange={(e) => handleRoleChange(idx, "skillInput", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddRoleSkill(idx);
                        }
                      }}
                      className="input-field text-xs"
                      placeholder="Type a skill and press Enter or Add"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRoleSkill(idx)}
                      className="btn-outline text-xs px-3 shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2 flex-wrap">
          <Link
            href="/projects"
            className="btn-outline text-sm min-h-[44px] flex items-center justify-center flex-1 sm:flex-initial"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-sm font-bold px-6 min-h-[44px] flex items-center justify-center flex-1 sm:flex-initial"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Publishing Project...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus size={16} />
                Publish Project
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

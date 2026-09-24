"use client";
const session = true;

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { UserProfileRead } from "@/lib/types";
import {
  User,
  Loader2,
  Save,
  ArrowLeft,
  X,
  Plus,
  Github,
  Linkedin,
  ExternalLink,
  Sparkles,
} from "lucide-react";

const SUGGESTED_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "Python",
  "FastAPI",
  "Node.js",
  "Go",
  "Rust",
  "PostgreSQL",
  "Docker",
  "Kubernetes",
  "Tailwind CSS",
  "Figma",
  "PyTorch",
  "TensorFlow",
  "React Native",
  "Flutter",
  "GraphQL",
];

const SUGGESTED_ROLES = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full-Stack Engineer",
  "Mobile Developer",
  "UI/UX Designer",
  "AI / ML Engineer",
  "DevOps / Infra",
  "Data Scientist",
  "Product Manager",
];

const SUGGESTED_INTERESTS = [
  "Hackathons",
  "Side Projects",
  "Open Source",
  "FinTech",
  "HealthTech",
  "EdTech",
  "AI Agents",
  "Developer Tools",
  "Web3",
  "ClimateTech",
];

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [availability, setAvailability] = useState("open");
  const [skills, setSkills] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      if (session) {
        const api = createApiClient(DEVELOPMENT_USER_ID);
        const p = await api.get<UserProfileRead>("/users/me").catch(() => null);
        if (p) {
          setDisplayName(p.display_name || "");
          setUsername(p.username || "");
          setHeadline(p.headline || "");
          setBio(p.bio || "");
          setGithubUrl(p.github_url || "");
          setLinkedinUrl(p.linkedin_url || "");
          setCollege(p.college || "");
          setDepartment(p.department || "");
          setYear(p.year || "");
          setPortfolioUrl(p.portfolio_url || "");
          setExperienceLevel(p.experience_level || "intermediate");
          setAvailability(p.availability || "open");
          setSkills(p.skills || []);
          setRoles(p.roles || []);
          setInterests(p.interests || []);
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  function handleAddSkill() {
    const s = newSkillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills((prev) => [...prev, s]);
      setNewSkillInput("");
    }
  }

  function handleRemoveSkill(s: string) {
    setSkills((prev) => prev.filter((item) => item !== s));
  }

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function toggleInterest(item: string) {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {

      if (!session) {
        toast("Development identity unavailable", "error");
        setSaving(false);
        return;
      }

      const api = createApiClient(DEVELOPMENT_USER_ID);
      await api.patch<UserProfileRead>("/users/me", {
        display_name: displayName.trim() || null,
        username: username.trim() || null,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        github_url: githubUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        college: college.trim() || null,
        department: department.trim() || null,
        year: year.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        experience_level: experienceLevel,
        availability,
        skills,
        roles,
        interests,
      });

      toast("Profile updated successfully!");
      router.push("/profile");
    } catch (err: any) {
      toast(err?.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Profile</span>
        </Link>

        {username && (
          <Link
            href={`/profile/${username}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <span>View Public Profile</span>
            <ExternalLink size={12} />
          </Link>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Edit Builder Profile
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Provide your technical skills, role preferences, and collaboration availability.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Identity */}
        <div className="card !p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Basic Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="e.g. Alex Chen"
                required
              />
            </div>

            <div>
              <label className="label">Public Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-7"
                  placeholder="alexchen"
                  pattern="[a-zA-Z0-9_]{3,30}"
                  title="3-30 alphanumeric characters or underscores"
                  required
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Unique identifier used in your profile URL (/profile/{username || "..."}).
              </p>
            </div>
          </div>

          <div>
            <label className="label">Role Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="input-field"
              placeholder="e.g. Full-Stack Dev | Next.js & Python | Building AI Agents"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              A quick one-liner summarizing your core strengths to prospective teammates.
            </p>
          </div>

          <div>
            <label className="label">Bio & Background</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="input-field resize-y"
              placeholder="Tell teammates about what you like building, recent hackathons, and what projects excite you..."
            />
          </div>

          {/* Academic & Experience Details */}
          <div className="pt-4 border-t border-gray-100 dark:border-white/[0.06] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Academic & Experience
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">College / University</label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Stanford University"
                />
              </div>
              <div>
                <label className="label">Department / Major</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div>
                <label className="label">Graduation Year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 2027"
                />
              </div>
            </div>

            <div>
              <label className="label">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="input-field"
              >
                <option value="beginner">Beginner / Freshman Builder</option>
                <option value="intermediate">Intermediate / Hackathon Participant</option>
                <option value="advanced">Advanced / Experienced Builder & Lead</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Collaboration Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="input-field"
            >
              <option value="open">Open to All Collaborations</option>
              <option value="looking_for_hackathon">Looking for Hackathon Squad</option>
              <option value="looking_for_project">Looking for Side Project</option>
              <option value="busy">Currently Busy / Full</option>
            </select>
          </div>
        </div>

        {/* Roles & Tech Skills */}
        <div className="card !p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Primary Roles
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Select the roles you are most confident contributing:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_ROLES.map((r) => {
                const isSelected = roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-primary text-white shadow-sm"
                        : "bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Technical Skills & Tools
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Click suggested tags or type your own tech stack:
            </p>

            {/* Selected Skills Tags */}
            <div className="flex flex-wrap gap-2 mb-3 min-h-[32px] p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
              {skills.length === 0 && (
                <span className="text-xs text-gray-400 italic">No skills added yet.</span>
              )}
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(s)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Custom Skill Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                className="input-field text-xs"
                placeholder="Type a skill and press Enter or Add (e.g. FastAPI, Prisma, Redis)"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="btn-outline text-xs px-3 shrink-0"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>

            {/* Suggested Skills Pill Cloud */}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSkills((prev) => [...prev, s])}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Interests & Domains
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_INTERESTS.map((item) => {
                const isSelected = interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Links & Socials */}
        <div className="card !p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Links & Profiles
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <Github size={14} />
                <span>GitHub URL</span>
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="input-field"
                placeholder="https://github.com/username"
              />
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <Linkedin size={14} />
                <span>LinkedIn URL</span>
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="input-field"
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1.5">
                <ExternalLink size={14} />
                <span>Portfolio / Personal Website</span>
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="input-field"
                placeholder="https://yourportfolio.dev"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 flex-wrap">
          <Link
            href="/profile"
            className="btn-outline text-sm min-h-[44px] flex items-center justify-center flex-1 sm:flex-initial"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-sm font-bold px-6 min-h-[44px] flex items-center justify-center flex-1 sm:flex-initial"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Saving Changes...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save size={16} />
                Save Profile
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

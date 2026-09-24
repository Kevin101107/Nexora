"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, ArrowRight, Lock, Mail, User, AlertCircle, Loader2, GraduationCap, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/auth";

const POPULAR_SKILLS = [
  "React", "Next.js", "TypeScript", "Python", "FastAPI", "PostgreSQL",
  "PyTorch", "Tailwind CSS", "Docker", "Figma", "Go", "Flutter",
];

const AVAILABLE_ROLES = [
  "Frontend Engineer", "Backend Engineer", "Full-Stack Engineer",
  "AI / ML Engineer", "UI/UX Designer", "Mobile Developer", "Product Manager",
];

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("2027");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["React", "TypeScript"]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["Frontend Engineer"]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await register({
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        college: college.trim() || undefined,
        department: department.trim() || undefined,
        year: year.trim() || undefined,
        headline: `${selectedRoles[0] || 'Builder'} studying ${department || 'Engineering'} at ${college || 'University'}`,
        skills: selectedSkills,
        roles: selectedRoles,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] dark:bg-[#0f0f17] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-6 group">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
            <Users size={22} />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
            Nexora<span className="text-primary">.</span>
          </span>
        </Link>
        <h2 className="text-center text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Create your builder account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Find student teammates and build projects together
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white dark:bg-[#16162a] py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-gray-200 dark:border-white/[0.08]">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Maya Iyer"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="mayaiyer"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Student Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maya@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Password * (6+ chars)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Academic Profile */}
            <div className="pt-2 border-t border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <GraduationCap size={14} />
                <span>Academic Profile</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="College or University (e.g. Stanford)"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Grad Year (2027)"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Preferred Roles */}
            <div className="pt-2 border-t border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Briefcase size={14} />
                <span>Preferred Roles</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_ROLES.map((role) => {
                  const active = selectedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? "bg-primary text-white shadow-sm shadow-primary/20"
                          : "bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skills */}
            <div className="pt-2 border-t border-gray-100 dark:border-white/[0.06]">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Primary Skills & Technologies
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILLS.map((skill) => {
                  const active = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-primary/15 text-primary border border-primary/30 font-bold"
                          : "bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-white/10"
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-600 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

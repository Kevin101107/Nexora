"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, ArrowRight, Lock, Mail, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, demoLogin } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your username/email and password");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await login(identifier.trim(), password.trim());
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (userId: string, username: string) => {
    try {
      setError(null);
      setDemoLoading(username);
      await demoLogin(userId, username);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in demo user");
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] dark:bg-[#0f0f17] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-6 group">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
            <Users size={22} />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
            Nexora<span className="text-primary">.</span>
          </span>
        </Link>
        <h2 className="text-center text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Sign in to discover student teammates and collaborate
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-[#16162a] py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-gray-200 dark:border-white/[0.08]">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="maya or maya@nexora.local"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Password
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-600 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                1-Click Quick Demo Sign In
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: "user-alice", user: "maya", name: "Maya", role: "Full-Stack" },
                { id: "user-bob", user: "arjun", name: "Arjun", role: "Backend" },
                { id: "user-cora", user: "zoya", name: "Zoya", role: "UI/UX Design" },
                { id: "user-diego", user: "devpatel", name: "Dev", role: "AI / ML" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={demoLoading !== null}
                  onClick={() => handleDemo(d.id, d.user)}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] hover:border-primary/50 dark:hover:border-primary/50 bg-gray-50 dark:bg-white/[0.02] hover:bg-primary/5 transition-all text-left flex flex-col justify-center"
                >
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {demoLoading === d.user ? "Signing in..." : d.name}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {d.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-bold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

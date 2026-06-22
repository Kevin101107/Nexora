"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.session) { router.push("/dashboard"); return; }
    setDone(true);
    setLoading(false);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
  }

  if (done) {
    return (
      <div className="editorial-atmo min-h-screen flex items-center justify-center bg-[#f4f1ea] px-4 dark:bg-[#0f0f17]">
        <div className="text-center max-w-sm card">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 text-2xl">@</div>
          <h2 className="font-display text-4xl text-[#171e38] dark:text-white mb-2">Check your email</h2>
          <p className="text-sm text-gray-500 dark:text-white/45">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editorial-atmo min-h-screen bg-[#f4f1ea] px-4 py-8 dark:bg-[#0f0f17]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
        <section className="px-2 sm:px-6 lg:px-0">
          <p className="mb-4 inline-flex rounded-full border border-[#e6ded0] bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:border-white/15 dark:bg-white/5 dark:text-white/55">
            Start your momentum
          </p>
          <h1 className="font-display text-5xl leading-[0.95] text-[#171e38] dark:text-white sm:text-6xl">
            Build habits.
            <br />
            Reach goals.
          </h1>
          <p className="mt-4 max-w-md text-base text-gray-600 dark:text-white/70">
            Create your Nexora account and turn daily study into measurable progress.
          </p>
        </section>

        <div className="w-full max-w-md justify-self-center">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Nexora<span className="text-primary">.</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-white/40 mt-2">Create your account</p>
          </div>

          <div className="card">
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-3 py-2.5">
                  {error}
                </div>
              )}
              <div>
                <label className="label">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Your name" autoFocus />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="you@example.com" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input-field" placeholder="At least 6 characters" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary pill-cta w-full justify-center">
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-white/[0.08]" /></div>
              <div className="relative flex justify-center"><span className="text-xs text-gray-400 bg-white dark:bg-[#16162a] px-2">or</span></div>
            </div>

            <button type="button" onClick={handleGoogle} className="btn-outline w-full justify-center gap-2 rounded-full py-3">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-white/35 mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

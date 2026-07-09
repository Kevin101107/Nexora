"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
  Sparkles, Timer, Layers, BarChart3, FileText,
  Bot, Zap, CheckCircle, ArrowRight, Eye, EyeOff,
  Flame, Target, Trophy, Sun, Moon
} from "lucide-react";

/* ── Feature preview cards ───────────────────────────────── */
const PREVIEW_CARDS = [
  { icon: BarChart3, title: "Dashboard",   desc: "Track XP, streaks & study stats",       color: "from-violet-500/20 to-purple-500/20", darkColor: "dark:from-violet-500/10 dark:to-purple-500/10", delay: 0 },
  { icon: Bot,       title: "AI Tutor",    desc: "Chat, explain, quiz & summarize",       color: "from-blue-500/20 to-cyan-500/20",     darkColor: "dark:from-blue-500/10 dark:to-cyan-500/10",     delay: 1 },
  { icon: FileText,  title: "Smart Notes", desc: "Rich editor with auto-save & tags",     color: "from-emerald-500/20 to-teal-500/20",  darkColor: "dark:from-emerald-500/10 dark:to-teal-500/10",  delay: 2 },
  { icon: Layers,    title: "Flashcards",  desc: "Spaced repetition with AI generation",  color: "from-amber-500/20 to-orange-500/20",  darkColor: "dark:from-amber-500/10 dark:to-orange-500/10",  delay: 3 },
  { icon: Timer,     title: "Focus Timer", desc: "Pomodoro with ambient sounds & XP",     color: "from-pink-500/20 to-rose-500/20",     darkColor: "dark:from-pink-500/10 dark:to-rose-500/10",     delay: 4 },
  { icon: BarChart3, title: "Analytics",   desc: "Study hours, trends & badge progress",  color: "from-indigo-500/20 to-violet-500/20", darkColor: "dark:from-indigo-500/10 dark:to-violet-500/10", delay: 5 },
];

const FEATURES = [
  { icon: Sparkles,  label: "AI Tutor" },
  { icon: Layers,    label: "Flashcards" },
  { icon: Timer,     label: "Pomodoro" },
  { icon: FileText,  label: "Smart Notes" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Zap,       label: "Gamification" },
];

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing",  href: "#pricing" },
  { label: "Roadmap",  href: "#roadmap" },
  { label: "About",    href: "#about" },
  { label: "Docs",     href: "#docs" },
];

const PROMPTS_TO_TYPE = [
  "Explain quantum physics like I'm 5...",
  "Summarize cell division in 3 points...",
  "Give me a quiz on JavaScript loops...",
  "Generate 10 flashcards on organic chem...",
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Dynamic Widget States
  const [xp, setXp] = useState(0);
  const [timerText, setTimerText] = useState("25:00");
  const [typingText, setTypingText] = useState("");
  
  // Theme Switching State
  const [dark, setDark] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Theme
  useEffect(() => {
    const saved = localStorage.getItem("nexora_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDark() {
    const nextTheme = !dark;
    setDark(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme);
    localStorage.setItem("nexora_theme", nextTheme ? "dark" : "light");
  }

  // Cursor following glow
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 1. XP Counter animation (counts up from 0 to 520 on load)
  useEffect(() => {
    let start = 0;
    const end = 520;
    const duration = 1200;
    const stepTime = Math.abs(Math.floor(duration / end));

    const timer = setInterval(() => {
      start += 13;
      if (start >= end) {
        setXp(end);
        clearInterval(timer);
      } else {
        setXp(start);
      }
    }, stepTime * 13);

    return () => clearInterval(timer);
  }, []);

  // 2. Focus Countdown Timer (ticks down dynamically)
  useEffect(() => {
    let s = 25 * 60;
    const timer = setInterval(() => {
      s -= 1;
      if (s < 0) s = 25 * 60;
      const m = Math.floor(s / 60);
      const sec = s % 60;
      setTimerText(`${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. AI Tutor Typing prompt simulator
  useEffect(() => {
    let promptIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 80;

    function type() {
      const currentPrompt = PROMPTS_TO_TYPE[promptIndex];
      if (isDeleting) {
        setTypingText((prev) => prev.slice(0, -1));
        charIndex--;
        typingSpeed = 30;
      } else {
        setTypingText((prev) => prev + currentPrompt.charAt(charIndex));
        charIndex++;
        typingSpeed = 80;
      }

      if (!isDeleting && charIndex === currentPrompt.length) {
        isDeleting = true;
        typingSpeed = 2200; // Pause at the end
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        promptIndex = (promptIndex + 1) % PROMPTS_TO_TYPE.length;
        typingSpeed = 400; // Pause before starting new word
      }

      setTimeout(type, typingSpeed);
    }

    const timerId = setTimeout(type, 800);
    return () => clearTimeout(timerId);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push(next);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback?next=${next}` } });
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email above first"); return; }
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/profile`,
    });
    if (err) setError(err.message);
    else { setError(""); alert("Password reset email sent! Check your inbox."); }
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-[#f7f5f0] dark:bg-[#08080f] flex flex-col justify-between"
    >
      {/* ── Animated background ───────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-40 dark:opacity-30 animate-aurora"
          style={{
            background: "linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(59,130,246,0.1) 25%, rgba(168,85,247,0.12) 50%, rgba(108,99,255,0.15) 75%, rgba(59,130,246,0.1) 100%)",
            backgroundSize: "300% 300%",
          }}
        />
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/25 to-purple-500/15 blur-3xl animate-blob-float" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-500/10 blur-3xl animate-blob-float-delayed" />
        <div className="absolute -bottom-40 left-1/4 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/10 blur-3xl animate-blob-float-slow" />
        <div className="absolute top-20 left-1/2 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-indigo-500/10 to-emerald-500/5 blur-3xl animate-blob-float-delayed" />
        <div
          className="absolute w-[600px] h-[600px] rounded-full transition-all duration-[1500ms] ease-out"
          style={{
            left: `${mousePos.x}%`, top: `${mousePos.y}%`,
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(rgba(108,99,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.4) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Top navigation ────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between px-6 lg:px-10 py-4 animate-fade-up shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8.5 h-8.5 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary animate-glow-dot" />
          </div>
          <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
            Nexora<span className="text-primary">.</span>
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} className="nav-link text-sm font-semibold text-gray-700 dark:text-white/60 hover:text-gray-955 dark:hover:text-white transition-colors">
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDark}
            className="p-2 rounded-xl text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link href="/signup" className="text-xs font-bold bg-primary hover:bg-primary-600 text-white px-4.5 py-2.5 rounded-full transition-all shadow-sm hover:shadow-[0_4px_12px_rgba(108,99,255,0.25)] hover:-translate-y-0.5 active:translate-y-0">
            Sign up free
          </Link>
        </div>
      </nav>

      {/* ── Main content grid ─────────────────────────────── */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-6 pb-12 pt-2 lg:grid-cols-[1.18fr_0.82fr] lg:gap-16 lg:min-h-[calc(100vh-80px)] flex-1">

        {/* ── LEFT: Product showcase ────────────────────── */}
        <section className="hidden lg:flex flex-col justify-center">
          {/* Headline */}
          <div className="animate-fade-up mb-6">
            <h1 className="font-display text-[3.5rem] leading-[0.92] text-[#151f3f] dark:text-white sm:text-[4.2rem] mb-4">
              Study smarter,<br />not harder.
            </h1>
            <p className="text-lg text-gray-700 dark:text-white/70 max-w-lg leading-relaxed font-medium">
              AI-powered notes, flashcards, focus sessions, and quizzes —
              everything you need in one beautiful workspace.
            </p>
          </div>

          {/* Feature badges */}
          <div className="animate-fade-up-1 flex flex-wrap gap-2 mb-6">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/70 dark:bg-white/[0.06] border border-white/50 dark:border-white/[0.08] text-gray-700 dark:text-white/70 backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-default shadow-sm">
                <Icon size={12} className="text-primary" />
                {label}
              </span>
            ))}
          </div>

          {/* Trust + social proof */}
          <p className="animate-fade-up-2 text-sm text-gray-700 dark:text-white/60 mb-8 font-medium">
            <CheckCircle size={13} className="inline -mt-0.5 mr-1 text-emerald-500 animate-pulse" />
            Built by students, for students · Free to use · AI-powered by Gemini
          </p>

          {/* ── Dashboard preview widget ────────────────── */}
          <div className="animate-fade-up-3 glass-card rounded-2xl p-5 mb-6 max-w-md" id="about">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 size={12} className="text-primary" />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-white/70 uppercase tracking-wider">Live Preview</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Interactive
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Total XP",      value: `${xp} XP`,  icon: Zap,    color: "text-primary animate-pulse",     bg: "bg-primary/10" },
                { label: "Study Streak",   value: "18 days",   icon: Flame,  color: "text-orange-500 animate-bounce", bg: "bg-orange-50 dark:bg-orange-500/10" },
                { label: "Focus Timer",    value: timerText,   icon: Timer,  color: "text-emerald-500",               bg: "bg-emerald-50 dark:bg-emerald-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="stat-glow rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-white/40 dark:bg-white/[0.02] p-3 text-center cursor-default">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon size={13} className={color} />
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
                  <p className="text-[10px] text-gray-600 dark:text-white/40 font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-8 rounded-lg bg-white/60 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] flex items-center px-3 select-none">
                <Bot size={12} className="text-primary mr-2 flex-shrink-0" />
                <span className="text-[11px] text-gray-700 dark:text-white/60 font-semibold flex items-center truncate">
                  {typingText}
                  <span className="w-1 h-3 ml-0.5 bg-primary dark:bg-primary-400 animate-pulse" />
                </span>
              </div>
              <div className="h-8 px-3 rounded-lg bg-primary/10 flex items-center gap-1.5 shrink-0">
                <Trophy size={11} className="text-primary" />
                <span className="text-[11px] font-bold text-primary">Level 6</span>
              </div>
            </div>
          </div>

          {/* ── Feature cards grid ──────────────────────── */}
          <div className="animate-fade-up-4 grid grid-cols-3 gap-2.5" id="features">
            {PREVIEW_CARDS.map(({ icon: Icon, title, desc, color, darkColor, delay }) => (
              <div
                key={title}
                className={`feature-card group relative rounded-2xl border border-white/40 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm p-3.5 cursor-default`}
                style={{ animationDelay: `${delay * 0.08}s` }}
              >
                <div className={`feature-icon w-7 h-7 rounded-lg bg-gradient-to-br ${color} ${darkColor} flex items-center justify-center mb-2`}>
                  <Icon size={13} className="text-gray-700 dark:text-white/70" />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-0.5">{title}</h3>
                <p className="text-[10px] text-gray-700 dark:text-white/50 leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── RIGHT: Login card ─────────────────────────── */}
        <div className="w-full max-w-[420px] justify-self-center animate-fade-up-2">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <Sparkles size={18} className="text-primary" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary animate-glow-dot" />
            </div>
            <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              Nexora<span className="text-primary">.</span>
            </span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-gray-700 dark:text-white/60 font-medium mt-2">
              Sign in to continue your study streak
            </p>
          </div>

          {/* Glassmorphism card */}
          <div className="glass-card rounded-3xl p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-3.5 py-2.5 animate-fade-up">
                  {error}
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field !py-3.5 !rounded-xl !text-[15px]"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-field !py-3.5 !rounded-xl !text-[15px] !pr-11"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/50 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-primary hover:text-primary-600 hover:underline font-semibold transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-glow w-full justify-center rounded-xl px-6 py-4 text-[15px] font-semibold text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={16} className="btn-arrow" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/50 dark:border-white/[0.05]" />
              </div>
              <div className="relative flex justify-center">
                <span className="text-xs text-gray-600 dark:text-white/50 bg-white/60 dark:bg-[#16162a]/70 px-3 backdrop-blur-sm font-semibold">
                  or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="group w-full flex items-center justify-center gap-2.5 rounded-xl border-2 border-gray-200/50 dark:border-white/[0.08] py-3.5 text-[15px] font-semibold text-gray-700 dark:text-white/70 bg-white/40 dark:bg-white/[0.03] hover:bg-white/80 dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.15] hover:shadow-lg hover:shadow-gray-200/40 dark:hover:shadow-primary/5 transition-all duration-250 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
            >
              <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <p className="text-center text-sm text-gray-700 dark:text-white/60 font-semibold mt-6">
              No account?{" "}
              <Link href="/signup" className="text-primary font-bold hover:underline transition-colors">
                Sign up free →
              </Link>
            </p>
          </div>

          {/* Mobile feature badges */}
          <div className="lg:hidden flex flex-wrap justify-center gap-1.5 mt-6">
            {FEATURES.slice(0, 4).map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/50 dark:bg-white/[0.05] border border-white/30 dark:border-white/[0.06] text-gray-700 dark:text-white/60 backdrop-blur-sm">
                <Icon size={10} className="text-primary" />
                {label}
              </span>
            ))}
          </div>
          <p className="lg:hidden text-center text-xs text-gray-700 dark:text-white/60 mt-3 font-medium">
            <CheckCircle size={11} className="inline -mt-0.5 mr-0.5 text-emerald-500" />
            Free · AI-powered · Built by students
          </p>
        </div>
      </div>

      {/* ── Footer / Measurable Stats ────────────────────── */}
      <footer className="relative z-10 w-full border-t border-gray-200/50 dark:border-white/[0.05] bg-white/20 dark:bg-black/10 backdrop-blur px-6 py-6 text-center text-xs text-gray-700 dark:text-white/50 shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-semibold">
          <span>© {new Date().getFullYear()} Nexora. All rights reserved.</span>
          <div className="flex flex-wrap justify-center gap-6">
            <span>🚀 Join 1,000+ students</span>
            <span>🔥 10,000+ focus sessions completed</span>
            <span>🎓 Built by students, for students</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#08080f] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-gray-500 text-sm font-medium">Loading Nexora…</span>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

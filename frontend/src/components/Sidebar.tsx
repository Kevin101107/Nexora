"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Timer, Sparkles, Layers, User, LogOut, Sun, Moon,
  ChevronLeft, ChevronRight, Trophy
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard",   label: "Dashboard",  icon: LayoutDashboard },
  { href: "/notes",       label: "Notes",      icon: FileText },
  { href: "/focus",       label: "Focus",      icon: Timer },
  { href: "/ai",          label: "AI Tutor",   icon: Sparkles },
  { href: "/flashcards",  icon: Layers,        label: "Flashcards" },
  { href: "/profile",     label: "Profile",    icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // Theme Initializer
    const savedTheme = localStorage.getItem("nexora_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = savedTheme ? savedTheme === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    // Sidebar Collapse Initializer
    const savedCollapse = localStorage.getItem("sidebar_collapsed") === "true";
    setCollapsed(savedCollapse);

    // Fetch User Profile
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const api = createApiClient(session.access_token);
      api.get<any>("/users/me").then(setProfile).catch(() => null);
    });
  }, []);

  function toggleDark() {
    const nextTheme = !dark;
    setDark(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme);
    localStorage.setItem("nexora_theme", nextTheme ? "dark" : "light");
  }

  function toggleCollapse() {
    const nextCollapse = !collapsed;
    setCollapsed(nextCollapse);
    localStorage.setItem("sidebar_collapsed", String(nextCollapse));
    window.dispatchEvent(new Event("sidebar_toggle"));
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const nameInitial = profile?.display_name
    ? profile.display_name.charAt(0).toUpperCase()
    : profile?.email
    ? profile.email.charAt(0).toUpperCase()
    : "S";

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen flex-col bg-white dark:bg-[#0f0f17] border-r border-gray-100 dark:border-white/[0.06] z-30 transition-all duration-300 ${
        collapsed ? "w-18" : "w-60"
      }`}>
        {/* Header Section */}
        <div className="px-5 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between shrink-0">
          {!collapsed && (
            <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white animate-fade-up">
              Nexora<span className="text-primary">.</span>
            </span>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white transition-all mx-auto"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-primary/10 dark:bg-primary/15 text-primary"
                    : "text-gray-700 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
                }`}
                title={collapsed ? label : undefined}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} className="flex-shrink-0" />
                {!collapsed && <span className="truncate animate-fade-up">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions & Profile details */}
        <div className="p-3 border-t border-gray-100 dark:border-white/[0.06] space-y-2 shrink-0">
          {/* Quick Profile Summary */}
          {profile && (
            <div className={`p-2 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100/50 dark:border-white/[0.03] ${
              collapsed ? "text-center flex justify-center py-3" : "flex items-center gap-2.5"
            }`}>
              <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                {nameInitial}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1 animate-fade-up">
                  <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                    {profile.display_name || profile.email.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-gray-700 dark:text-white/40 font-bold flex items-center gap-1 mt-0.5">
                    <Trophy size={9} className="text-yellow-500" />
                    Level {profile.level ?? 1} • {profile.xp ?? 0} XP
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Theme switcher */}
          <button
            type="button"
            onClick={toggleDark}
            className={`btn-ghost w-full hover:text-gray-900 dark:hover:text-white text-gray-700 dark:text-white/50 ${
              collapsed ? "justify-center p-2.5" : "justify-start gap-3 text-sm"
            }`}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && <span className="animate-fade-up">{dark ? "Light mode" : "Dark mode"}</span>}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className={`btn-ghost w-full hover:text-red-600 dark:hover:text-red-400 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 ${
              collapsed ? "justify-center p-2.5" : "justify-start gap-3 text-sm"
            }`}
            title="Log out"
          >
            <LogOut size={16} />
            {!collapsed && <span className="animate-fade-up">Log out</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Navigation ────────────────────────────── */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0f0f17]/95 backdrop-blur">
        <nav className="grid grid-cols-6 gap-1 px-2 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold ${
                  active
                    ? "text-primary bg-primary/10 dark:bg-primary/15"
                    : "text-gray-700 dark:text-white/60"
                }`}
              >
                <Icon size={16} />
                <span className="leading-none">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between px-3 pb-2 border-t border-gray-100 dark:border-white/[0.04] pt-1">
          <button type="button" onClick={toggleDark} className="btn-ghost text-xs px-2 py-1.5 text-gray-700 dark:text-white/50">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {dark ? "Light" : "Dark"}
          </button>
          <button type="button" onClick={logout} className="btn-ghost text-xs px-2 py-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
            <LogOut size={14} />
            Log out
          </button>
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Compass, FolderGit2, Users, Inbox, User, Sun, Moon,
  ChevronLeft, ChevronRight, Bell
} from "lucide-react";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { UnreadCountResponse } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discover",  label: "Discover",  icon: Compass },
  { href: "/projects",  label: "Projects",  icon: FolderGit2 },
  { href: "/teams",     label: "Teams",     icon: Users },
  { href: "/requests",  label: "Requests",  icon: Inbox },
  { href: "/notifications", label: "Inbox", icon: Bell, badge: true },
  { href: "/profile",   label: "Profile",   icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(() => {
    const api = createApiClient(DEVELOPMENT_USER_ID);
    api.get<UnreadCountResponse>("/notifications/unread-count")
      .then((data) => setUnreadCount(data.unread_count || 0))
      .catch(() => null);
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const handleFocus = () => fetchUnreadCount();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("notifications_updated", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("notifications_updated", handleFocus);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();
  }, [pathname, fetchUnreadCount]);

  useEffect(() => {
    // Theme Initializer
    const savedTheme = localStorage.getItem("nexora_theme");
    const isDark = savedTheme !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    // Sidebar Collapse Initializer
    const savedCollapse = localStorage.getItem("sidebar_collapsed") === "true";
    setCollapsed(savedCollapse);

    // Fetch User Profile
    const api = createApiClient(DEVELOPMENT_USER_ID);
    api.get<any>("/users/me").then(setProfile).catch(() => null);
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
          {NAV.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname.startsWith(href);
            const showBadge = badge && unreadCount > 0;
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
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                  {collapsed && showBadge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-white dark:ring-[#0f0f17]" />
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="truncate animate-fade-up">{label}</span>
                    {showBadge && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary text-white shrink-0 animate-fade-up">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </>
                )}
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
                  <p className="text-[10px] text-gray-500 dark:text-white/40 font-medium truncate mt-0.5">
                    {profile.headline || (profile.roles && profile.roles.length > 0 ? profile.roles[0] : "Student Builder")}
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

        </div>
      </aside>

      {/* ── Mobile Navigation ────────────────────────────── */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0f0f17]/95 backdrop-blur">
        <nav className="grid grid-cols-7 gap-1 px-1 py-2">
          {NAV.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname.startsWith(href);
            const showBadge = badge && unreadCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold ${
                  active
                    ? "text-primary bg-primary/10 dark:bg-primary/15"
                    : "text-gray-700 dark:text-white/60"
                }`}
              >
                <div className="relative">
                  <Icon size={16} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center text-[8px] font-bold rounded-full bg-primary text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="leading-none truncate max-w-full">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between px-3 pb-2 border-t border-gray-100 dark:border-white/[0.04] pt-1">
          <button type="button" onClick={toggleDark} className="btn-ghost text-xs px-2 py-1.5 text-gray-700 dark:text-white/50">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {dark ? "Light" : "Dark"}
          </button>
          <span className="text-[10px] font-semibold text-gray-400">Local demo mode</span>
        </div>
      </div>
    </>
  );
}

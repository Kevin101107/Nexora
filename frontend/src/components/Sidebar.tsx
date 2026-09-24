"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Compass, FolderGit2, Users, Inbox, User, Sun, Moon,
  ChevronLeft, ChevronRight, Bell, MoreHorizontal, X, LogOut, LogIn, Sparkles, ChevronDown
} from "lucide-react";
import { DEVELOPMENT_USER_ID } from "@/lib/development";
import { createApiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UnreadCountResponse } from "@/lib/types";
import { useCallback, useEffect, useState, useRef } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discover",  label: "Discover",  icon: Compass },
  { href: "/projects",  label: "Projects",  icon: FolderGit2 },
  { href: "/teams",     label: "Teams",     icon: Users },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/requests",      label: "Requests", icon: Inbox },
  { href: "/notifications", label: "Inbox",    icon: Bell, badge: true },
  { href: "/profile",       label: "Profile",  icon: User },
];

const NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, demoLogin, isAuthenticated } = useAuth();
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const activeUser = user || profile;

  const fetchUnreadCount = useCallback(() => {
    const api = createApiClient();
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

  // Close more menu when route changes
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Handle escape key to close more menu
  useEffect(() => {
    if (!moreOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moreOpen]);

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

  const nameInitial = activeUser?.display_name
    ? activeUser.display_name.charAt(0).toUpperCase()
    : activeUser?.username
    ? activeUser.username.charAt(0).toUpperCase()
    : activeUser?.email
    ? activeUser.email.charAt(0).toUpperCase()
    : "B";

  const isSecondaryActive = SECONDARY_NAV.some(({ href }) => pathname.startsWith(href));

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
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white transition-all mx-auto"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Sidebar navigation" className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname.startsWith(href);
            const showBadge = badge && unreadCount > 0;
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
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
        <div className="p-3 border-t border-gray-100 dark:border-white/[0.06] space-y-2 shrink-0 relative">
          {/* Quick Profile Summary / Account Switcher */}
          {activeUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className={`w-full p-2 rounded-2xl bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.05] border border-gray-100/50 dark:border-white/[0.03] transition-all text-left ${
                  collapsed ? "flex justify-center py-3" : "flex items-center gap-2.5"
                }`}
                title="Account settings & switcher"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                  {nameInitial}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1 animate-fade-up">
                    <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {activeUser.display_name || activeUser.username || activeUser.email?.split("@")[0]}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-white/40 font-medium truncate mt-0.5">
                      {activeUser.headline || (activeUser.roles && activeUser.roles.length > 0 ? activeUser.roles[0] : "Student Builder")}
                    </p>
                  </div>
                )}
                {!collapsed && <ChevronDown size={14} className="text-gray-400 shrink-0" />}
              </button>

              {/* Account Dropdown Popover */}
              {accountMenuOpen && (
                <div
                  ref={accountMenuRef}
                  className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-white/[0.1] shadow-xl p-2 z-50 animate-fade-up text-xs"
                >
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06] mb-1">
                    <p className="font-bold text-gray-900 dark:text-white truncate">
                      {activeUser.display_name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      @{activeUser.username || activeUser.id}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <User size={14} />
                    <span>View Profile</span>
                  </Link>
                  <Link
                    href="/profile/edit"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <Sparkles size={14} />
                    <span>Edit Profile</span>
                  </Link>

                  <div className="pt-1.5 mt-1.5 border-t border-gray-100 dark:border-white/[0.06]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-1">
                      Quick Demo Switch
                    </p>
                    {[
                      { id: "user-alice", user: "maya", name: "Maya (Full-Stack)" },
                      { id: "user-bob", user: "arjun", name: "Arjun (Backend)" },
                      { id: "user-cora", user: "zoya", name: "Zoya (Design)" },
                      { id: "user-diego", user: "devpatel", name: "Dev (AI/ML)" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={async () => {
                          await demoLogin(d.id, d.user);
                          setAccountMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] text-[11px] font-medium"
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-gray-100 dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setAccountMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-semibold"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`w-full p-2.5 rounded-2xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary-600 transition-all shadow-sm ${
                collapsed ? "p-2.5" : ""
              }`}
            >
              <LogIn size={15} />
              {!collapsed && <span>Sign In</span>}
            </Link>
          )}

          {/* Theme switcher */}
          <button
            type="button"
            onClick={toggleDark}
            className={`btn-ghost w-full hover:text-gray-900 dark:hover:text-white text-gray-700 dark:text-white/50 ${
              collapsed ? "justify-center p-2.5" : "justify-start gap-3 text-sm"
            }`}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && <span className="animate-fade-up">{dark ? "Light mode" : "Dark mode"}</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Navigation ────────────────────────────── */}
      {/* Backdrop for More sheet */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => {
            setMoreOpen(false);
            moreButtonRef.current?.focus();
          }}
          aria-hidden="true"
        />
      )}

      {/* More sheet / popover */}
      {moreOpen && (
        <div
          ref={moreMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="More navigation destinations"
          className="md:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 p-4 rounded-3xl bg-white dark:bg-[#12121f] border border-gray-200 dark:border-white/[0.1] shadow-2xl space-y-2 max-w-sm mx-auto animate-fade-up"
        >
          <div className="flex items-center justify-between px-2 pb-2 border-b border-gray-100 dark:border-white/[0.06]">
            <span className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">
              More Destinations
            </span>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                moreButtonRef.current?.focus();
              }}
              aria-label="Close menu"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1">
            {SECONDARY_NAV.map(({ href, label, icon: Icon, badge }) => {
              const active = pathname.startsWith(href);
              const showBadge = badge && unreadCount > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all min-h-[44px] ${
                    active
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                    <span>{label}</span>
                  </div>
                  {showBadge && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="pt-2.5 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between px-2">
            <button
              type="button"
              onClick={toggleDark}
              className="btn-ghost flex items-center gap-2 text-xs py-2 px-3 text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white min-h-[44px]"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              <span>{dark ? "Light mode" : "Dark mode"}</span>
            </button>
            <span className="text-[11px] font-medium text-gray-400 dark:text-white/40">Local demo mode</span>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0f0f17]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <nav aria-label="Mobile navigation" className="grid grid-cols-5 gap-1 px-2 py-1.5">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 min-h-[48px] text-[11px] font-semibold transition-all ${
                  active
                    ? "text-primary bg-primary/10 dark:bg-primary/15 font-bold"
                    : "text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span className="leading-none truncate">{label}</span>
              </Link>
            );
          })}

          {/* 5th Tab: More Button */}
          <button
            ref={moreButtonRef}
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-label="More navigation destinations"
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 min-h-[48px] text-[11px] font-semibold transition-all ${
              isSecondaryActive || moreOpen
                ? "text-primary bg-primary/10 dark:bg-primary/15 font-bold"
                : "text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <div className="relative">
              <MoreHorizontal size={18} strokeWidth={isSecondaryActive || moreOpen ? 2.5 : 2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center text-[8px] font-bold rounded-full bg-primary text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="leading-none truncate">More</span>
          </button>
        </nav>
      </div>
    </>
  );
}

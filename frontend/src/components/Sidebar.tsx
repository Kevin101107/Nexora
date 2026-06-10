"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Timer, Sparkles, Layers, User, LogOut, Sun, Moon,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard",   label: "Dashboard",  icon: LayoutDashboard },
  { href: "/notes",       label: "Notes",      icon: FileText },
  { href: "/focus",       label: "Focus",      icon: Timer },
  { href: "/ai",          label: "AI Tutor",   icon: Sparkles },
  { href: "/flashcards",  label: "Flashcards", icon: Layers },
  { href: "/profile",     label: "Profile",    icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nexora_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nexora_theme", next ? "dark" : "light");
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-white dark:bg-[#0f0f17] border-r border-gray-100 dark:border-white/[0.06] z-30">
      <div className="px-5 py-5 border-b border-gray-100 dark:border-white/[0.06]">
        <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
          Nexora<span className="text-primary">.</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-primary/10 dark:bg-primary/15 text-primary"
                  : "text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 dark:border-white/[0.06] space-y-0.5">
        <button onClick={toggleDark} className="btn-ghost w-full justify-start gap-3 text-sm">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {dark ? "Light mode" : "Dark mode"}
        </button>
        <button onClick={logout} className="btn-ghost w-full justify-start gap-3 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400">
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}

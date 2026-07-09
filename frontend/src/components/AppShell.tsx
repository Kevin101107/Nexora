"use client";

import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useEffect, useState } from "react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const checkCollapse = () => {
      setCollapsed(localStorage.getItem("sidebar_collapsed") === "true");
    };
    checkCollapse();
    window.addEventListener("sidebar_toggle", checkCollapse);
    return () => window.removeEventListener("sidebar_toggle", checkCollapse);
  }, []);

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className={`flex-1 p-4 sm:p-6 md:p-8 pb-20 md:pb-8 min-h-screen transition-all duration-300 ${
          collapsed ? "md:ml-18" : "md:ml-60"
        }`}>
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

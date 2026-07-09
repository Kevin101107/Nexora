"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut().finally(() => {
      router.push("/login");
    });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0f0f17]">
      <div className="animate-pulse text-gray-400 text-sm">Logging you out...</div>
    </div>
  );
}

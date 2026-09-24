"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    const timeout = setTimeout(() => {
      router.push("/login");
    }, 1500);
    return () => clearTimeout(timeout);
  }, [logout, router]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] dark:bg-[#0f0f17] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 size={24} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
          You have been signed out
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Redirecting to login in a moment...
        </p>

        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-600 transition-all shadow-sm"
          >
            <span>Sign In Again</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

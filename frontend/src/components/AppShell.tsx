import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:ml-60 md:p-8 pb-20 md:pb-8 min-h-screen">{children}</main>
      </div>
    </AuthGuard>
  );
}

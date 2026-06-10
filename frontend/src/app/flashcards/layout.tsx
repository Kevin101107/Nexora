import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-60 flex-1 p-8">{children}</main>
      </div>
    </AuthGuard>
  );
}

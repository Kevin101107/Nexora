import type { Metadata } from "next";
import "../styles/globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Nexora — Find the right people to build with",
  description:
    "Student teammate-discovery and project-collaboration platform. Connect with compatible student builders, find project members, and form hackathon teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nexora_theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

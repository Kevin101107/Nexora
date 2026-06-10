"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";
interface Toast { id: number; type: ToastType; message: string; }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void; }

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-[100]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-[240px] max-w-xs border animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              t.type === "success"
                ? "bg-white dark:bg-[#16162a] border-gray-100 dark:border-white/[0.08] text-gray-900 dark:text-white"
                : "bg-white dark:bg-[#16162a] border-red-100 dark:border-red-500/20 text-gray-900 dark:text-white"
            }`}
          >
            {t.type === "success"
              ? <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              : <XCircle size={16} className="text-red-500 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

"use client";

import React from "react";
import Link from "next/link";
import { Loader2, AlertCircle, RefreshCw, FolderGit2 } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading data...",
  className = "py-24",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 text-center ${className}`}
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-xs sm:text-sm text-gray-500 dark:text-white/40 font-medium">
        {message}
      </p>
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Unable to load data",
  message = "A network or server issue prevented this content from loading. Please try again.",
  onRetry,
  className = "p-8",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`card !border-red-500/20 bg-red-500/[0.04] text-center space-y-3 max-w-xl mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
        <AlertCircle size={24} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-white/60 max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="btn-outline !py-2 !px-4 text-xs font-semibold inline-flex items-center gap-1.5 hover:border-red-400 hover:text-red-400 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number | string; className?: string }> | any;
  title: string;
  message?: string;
  action?:
    | {
        label: string;
        href?: string;
        onClick?: () => void;
      }
    | React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderGit2,
  title,
  message,
  action,
  className = "p-10",
}: EmptyStateProps) {
  return (
    <div
      className={`card text-center space-y-3.5 max-w-lg mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-400 dark:text-white/30 flex items-center justify-center mx-auto">
        <Icon size={24} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
        {message && (
          <p className="text-xs sm:text-sm text-gray-500 dark:text-white/50 max-w-sm mx-auto leading-relaxed">
            {message}
          </p>
        )}
      </div>
      {action && (
        <div className="pt-2">
          {React.isValidElement(action) ? (
            action
          ) : typeof action === "object" && "label" in (action as any) ? (
            (action as any).href ? (
              <Link
                href={(action as any).href}
                className="btn-primary text-xs !py-2 !px-4 inline-flex items-center gap-1.5"
              >
                <span>{(action as any).label}</span>
              </Link>
            ) : (action as any).onClick ? (
              <button
                type="button"
                onClick={(action as any).onClick}
                className="btn-primary text-xs !py-2 !px-4 inline-flex items-center gap-1.5"
              >
                <span>{(action as any).label}</span>
              </button>
            ) : null
          ) : null}
        </div>
      )}
    </div>
  );
}

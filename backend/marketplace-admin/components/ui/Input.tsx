"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ className, label, error, icon, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-foreground",
            "placeholder:text-text-muted",
            "focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
            "transition-colors duration-200",
            icon && "pl-10",
            error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

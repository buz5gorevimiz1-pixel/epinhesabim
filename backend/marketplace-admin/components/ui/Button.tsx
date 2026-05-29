"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        {
          "bg-accent hover:bg-accent-hover text-white shadow-sm shadow-accent/20": variant === "primary",
          "bg-surface-raised border border-border hover:border-border-strong text-foreground hover:bg-surface-hover": variant === "secondary",
          "text-text-secondary hover:text-foreground hover:bg-surface-raised": variant === "ghost",
          "bg-danger hover:bg-red-500 text-white shadow-sm shadow-danger/20": variant === "danger",
          "px-3 py-1.5 text-xs": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-2.5 text-sm": size === "lg",
        },
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}

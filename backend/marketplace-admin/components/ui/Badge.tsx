"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "accent" | "success" | "warning" | "danger" | "info" | "muted";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

export function Badge({ className, variant = "accent", size = "sm", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium tracking-tight",
        {
          "bg-accent-soft text-accent ring-1 ring-accent/15": variant === "accent",
          "bg-success-soft text-success ring-1 ring-success/15": variant === "success",
          "bg-warning-soft text-warning ring-1 ring-warning/15": variant === "warning",
          "bg-danger-soft text-danger ring-1 ring-danger/15": variant === "danger",
          "bg-info-soft text-info ring-1 ring-info/15": variant === "info",
          "bg-surface-raised text-text-secondary ring-1 ring-border": variant === "muted",
          "px-2 py-0.5 text-[11px]": size === "sm",
          "px-2.5 py-1 text-xs": size === "md",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

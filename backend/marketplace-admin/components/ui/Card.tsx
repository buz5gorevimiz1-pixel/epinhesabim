"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  border?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ className, hover, border = true, padding = "md", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface",
        border && "border border-border",
        hover && "card-hover",
        padding === "none" && "",
        padding === "sm" && "p-3",
        padding === "md" && "p-5",
        padding === "lg" && "p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-sm font-semibold text-foreground tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-text-muted mt-0.5", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm text-text-secondary", className)} {...props}>
      {children}
    </div>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface NeonTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: "cyan" | "magenta" | "lime" | "amber";
  as?: keyof JSX.IntrinsicElements;
}

export function NeonText({
  className,
  color = "cyan",
  children,
  ...props
}: NeonTextProps) {
  return (
    <span
      className={cn(
        "font-semibold",
        color === "cyan" && "text-cyan-400 neon-cyan",
        color === "magenta" && "text-fuchsia-400 neon-magenta",
        color === "lime" && "text-lime-400 neon-lime",
        color === "amber" && "text-amber-400 neon-amber",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

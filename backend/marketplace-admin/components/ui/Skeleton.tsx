"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export function Skeleton({ className, width, height, circle, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-surface-raised rounded",
        circle && "rounded-full",
        className
      )}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <Skeleton width={40} height={40} className="rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={28} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Skeleton width={16} height={16} circle />
        <Skeleton width="30%" height={12} />
      </div>
    </div>
  );
}

export function ActivitySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
          <Skeleton width={32} height={32} circle />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton width="50%" height={16} />
            <Skeleton width="70%" height={12} />
          </div>
          <Skeleton width={60} height={12} className="shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} width={`${80 + Math.random() * 40}px`} height={14} className="flex-1" />
      ))}
    </div>
  );
}

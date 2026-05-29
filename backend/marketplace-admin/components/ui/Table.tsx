"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeleton";

interface TableColumn<T = unknown> {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
}

interface TableProps<T = unknown> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  loading,
  skeletonRows = 5,
  emptyText = "Veri bulunmuyor.",
  onRowClick,
  className,
  headerClassName,
  rowClassName,
}: TableProps<T>) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-border bg-surface", className)}>
      <table className="w-full text-left">
        <thead>
          <tr className={cn("border-b border-border bg-surface-raised/50", headerClassName)}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right"
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton width={col.width || "80%"} height={14} />
                    </td>
                  ))}
                </tr>
              ))
            : data.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-text-muted">
                    {emptyText}
                  </td>
                </tr>
              )
              : data.map((row, index) => (
                  <tr
                    key={keyExtractor(row, index)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "transition-colors",
                      onRowClick && "cursor-pointer hover:bg-surface-raised/50",
                      rowClassName
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-[13px] text-foreground",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.render ? col.render(row, index) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                      </td>
                    ))}
                  </tr>
                ))}
        </tbody>
      </table>
    </div>
  );
}

export function TablePagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <span className="text-xs text-text-muted">
        Toplam {totalItems} kayıt
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Önceki
        </button>
        <span className="min-w-[2rem] text-center text-xs text-text-muted">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}

export function TableToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-3", className)}>
      {children}
    </div>
  );
}

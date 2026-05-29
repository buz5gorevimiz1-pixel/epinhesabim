"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showClose?: boolean;
}

export function Modal({ isOpen, onClose, title, description, children, className, size = "md", showClose = true }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full rounded-xl border border-border bg-surface shadow-xl",
          "animate-in zoom-in-95 slide-in-from-bottom-2 duration-200",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-md",
          size === "lg" && "max-w-lg",
          size === "xl" && "max-w-2xl",
          className
        )}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-0">
            <div className="flex-1 min-w-0">
              {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
              {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-raised hover:text-foreground shrink-0"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

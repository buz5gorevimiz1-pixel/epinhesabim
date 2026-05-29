"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_ITEMS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  HeadsetIcon,
  Radio,
  Megaphone,
  SlidersHorizontal,
  AlertTriangle,
  Ban,
  LayoutTemplate,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  Users: <Users size={18} />,
  Package: <Package size={18} />,
  CreditCard: <CreditCard size={18} />,
  ShieldCheck: <ShieldCheck size={18} />,
  LayoutTemplate: <LayoutTemplate size={18} />,
  HeadsetIcon: <HeadsetIcon size={18} />,
  Radio: <Radio size={18} />,
  Megaphone: <Megaphone size={18} />,
  SlidersHorizontal: <SlidersHorizontal size={18} />,
  AlertTriangle: <AlertTriangle size={18} />,
  Ban: <Ban size={18} />,
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "group relative flex h-screen flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-[56px] items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
          <ShieldCheck size={16} />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Control<span className="text-accent">Center</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        <div className={cn("mb-2 px-2", collapsed && "hidden")}>
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Menü</span>
        </div>
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-text-secondary hover:bg-surface-raised hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={cn("shrink-0", isActive && "text-accent")}>
                {iconMap[item.icon]}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <Badge variant="accent" size="sm">{item.badge}</Badge>
                  ) : null}
                </>
              )}
              {collapsed && isActive && (
                <span className="absolute left-0 h-5 w-[2px] rounded-r bg-accent" />
              )}
            </Link>
          );
        })}

        {!collapsed && (
          <>
            <div className="mt-4 mb-2 px-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Operasyon</span>
            </div>
            <Link
              href="/live-support"
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                pathname === "/live-support"
                  ? "bg-accent-soft text-accent"
                  : "text-text-secondary hover:bg-surface-raised hover:text-foreground"
              )}
            >
              <HeadsetIcon size={18} />
              <span className="flex-1">Canlı Destek</span>
            </Link>
            <Link
              href="/visitors"
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                pathname === "/visitors"
                  ? "bg-accent-soft text-accent"
                  : "text-text-secondary hover:bg-surface-raised hover:text-foreground"
              )}
            >
              <Radio size={18} />
              <span className="flex-1">Ziyaretçiler</span>
            </Link>
            <Link
              href="/fraud"
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                pathname === "/fraud"
                  ? "bg-accent-soft text-accent"
                  : "text-text-secondary hover:bg-surface-raised hover:text-foreground"
              )}
            >
              <AlertTriangle size={18} />
              <span className="flex-1">Fraud Kontrol</span>
            </Link>
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-9 w-full items-center justify-center border-t border-border text-text-muted hover:text-foreground transition-colors"
        title={collapsed ? "Genişlet" : "Daralt"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { cn, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { dashboardApi } from "@/lib/api";
import {
  Bell, LogOut, Search, User, Settings, X, Check,
  Wrench, Megaphone, Radio, ShieldCheck, AlertTriangle,
  Headset, Wifi, WifiOff
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const cb = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    };
    document.addEventListener("mousedown", cb);
    return () => document.removeEventListener("mousedown", cb);
  }, [ref, handler]);
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "şimdi";
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

export function Topbar({ className }: { className?: string }) {
  const { user, logout } = useAuth();
  const { connected, emit } = useSocket({ type: "admin" });

  const [notifOpen, setNotifOpen] = useState(false);
  const [ctrlOpen, setCtrlOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

  const [maintenance, setMaintenance] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMsg, setPopupMsg] = useState("");

  const notifRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useOutsideClick(notifRef, () => setNotifOpen(false));
  useOutsideClick(ctrlRef, () => setCtrlOpen(false));
  useOutsideClick(userRef, () => setUserOpen(false));
  useOutsideClick(searchRef, () => setSearchOpen(false));

  // Load system state on mount
  useEffect(() => {
    dashboardApi.systemStatus().then((res) => {
      if (res.success && res.data) {
        setMaintenance(res.data.maintenanceMode);
      }
    });
  }, []);

  // Load fraud alerts as notifications
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await dashboardApi.fraudAlerts();
      if (!mounted) return;
      if (res.success && res.data?.alerts) {
        setNotifications(
          res.data.alerts.map((a: any) => ({
            id: a.id,
            title: a.title,
            message: a.description,
            time: formatTimeAgo(a.createdAt),
            read: false,
            type: a.severity === "critical" ? "error" : a.severity === "high" ? "warning" : "info",
          }))
        );
      }
      setNotifLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleMaintenance = () => {
    const next = !maintenance;
    setMaintenance(next);
    emit("admin:maintenance", { enabled: next });
  };

  const sendPopup = () => {
    if (!popupMsg.trim()) return;
    emit("admin:popup", { enabled: true, message: popupMsg.trim() });
    setPopupMsg("");
    setPopupOpen(false);
  };

  const typeColors: Record<string, string> = {
    info: "bg-accent/10 text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    error: "bg-danger-soft text-danger",
  };

  return (
    <header
      className={cn(
        "flex h-[56px] items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-sm",
        className
      )}
    >
      {/* Left: Global Search */}
      <div className="relative w-full max-w-md" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input
            type="text"
            placeholder="Global ara: kullanıcı, sipariş, ilan..."
            className="h-8 w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
            onFocus={() => setSearchOpen(true)}
          />
        </div>
        {searchOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-border bg-surface shadow-xl py-2">
            <p className="px-3 py-2 text-xs text-text-muted">Aramak için Enter'a basın veya bir kategori seçin</p>
            <div className="flex gap-2 px-3 pb-1">
              <span className="rounded-md bg-accent/10 px-2 py-1 text-[11px] text-accent">Kullanıcılar</span>
              <span className="rounded-md bg-accent/10 px-2 py-1 text-[11px] text-accent">Siparişler</span>
              <span className="rounded-md bg-accent/10 px-2 py-1 text-[11px] text-accent">İlanlar</span>
              <span className="rounded-md bg-accent/10 px-2 py-1 text-[11px] text-accent">Finans</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1">
        {/* Connection Status */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium">
          {connected ? (
            <>
              <Wifi size={12} className="text-success" />
              <span className="text-success">CANLI</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-danger" />
              <span className="text-danger">OFFLINE</span>
            </>
          )}
        </div>

        {/* Quick Controls */}
        <div className="relative" ref={ctrlRef}>
          <button
            onClick={() => setCtrlOpen(!ctrlOpen)}
            className="relative rounded-md p-2 text-text-secondary transition-colors hover:bg-surface-raised hover:text-foreground"
            title="Operasyon Kontrolleri"
          >
            <Wrench size={17} />
          </button>

          {ctrlOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-border bg-surface shadow-xl py-2">
              <div className="px-3 py-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Operasyon Kontrolleri</h3>
                <p className="text-[11px] text-text-muted">Sistem durumunu anlık değiştir</p>
              </div>

              {/* Maintenance Toggle */}
              <div className="flex items-center justify-between px-3 py-2.5 hover:bg-surface-raised transition-colors">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className={maintenance ? "text-warning" : "text-success"} />
                  <div>
                    <p className="text-[13px] text-foreground">Bakım Modu</p>
                    <p className="text-[10px] text-text-muted">Siteyi bakım moduna al</p>
                  </div>
                </div>
                <button
                  onClick={toggleMaintenance}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    maintenance ? "bg-warning" : "bg-border-strong"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                      maintenance ? "left-[18px]" : "left-0.5"
                    )}
                  />
                </button>
              </div>

              {/* Popup Broadcast */}
              <div className="px-3 py-2.5 hover:bg-surface-raised transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone size={14} className="text-accent" />
                  <div>
                    <p className="text-[13px] text-foreground">Popup Yayınla</p>
                    <p className="text-[10px] text-text-muted">Tüm kullanıcılara anlık mesaj</p>
                  </div>
                </div>
                {popupOpen ? (
                  <div className="flex gap-2 mt-1.5">
                    <input
                      autoFocus
                      value={popupMsg}
                      onChange={(e) => setPopupMsg(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendPopup()}
                      placeholder="Mesaj yaz..."
                      className="flex-1 h-7 rounded-md border border-border bg-background px-2 text-[12px] text-foreground focus:outline-none focus:border-accent"
                    />
                    <button onClick={sendPopup} className="h-7 rounded-md bg-accent px-2 text-[11px] font-medium text-white hover:bg-accent-hover">
                      Gönder
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPopupOpen(true)}
                    className="mt-1.5 h-7 w-full rounded-md border border-border bg-surface-raised text-[12px] text-foreground hover:bg-surface-hover transition-colors"
                  >
                    Yeni popup oluştur
                  </button>
                )}
              </div>

              {/* Live Support Toggle */}
              <div className="flex items-center justify-between px-3 py-2.5 hover:bg-surface-raised transition-colors">
                <div className="flex items-center gap-2">
                  <Headset size={14} className="text-info" />
                  <div>
                    <p className="text-[13px] text-foreground">Canlı Destek</p>
                    <p className="text-[10px] text-text-muted">Widget durumu</p>
                  </div>
                </div>
                <Badge variant="success" size="sm">Aktif</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-md p-2 text-text-secondary transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[360px] rounded-xl border border-border bg-surface shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Bildirim Merkezi</h3>
                  <p className="text-[10px] text-text-muted">Fraud uyarıları ve sistem olayları</p>
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-accent hover:text-accent-hover transition-colors">
                    Tümünü okundu işaretle
                  </button>
                )}
              </div>
              <div className="max-h-[320px] overflow-y-auto py-1">
                {notifLoading ? (
                  <p className="py-6 text-center text-xs text-text-muted">Yükleniyor...</p>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <ShieldCheck size={24} className="text-success mx-auto mb-2" />
                    <p className="text-sm text-text-muted">Aktif fraud uyarısı yok</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Sistem güvenli</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-2.5 transition-colors cursor-pointer hover:bg-surface-raised",
                        !n.read && "bg-surface-raised/50"
                      )}
                      onClick={() => markRead(n.id)}
                    >
                      <div className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", typeColors[n.type].split(" ")[1])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground">{n.title}</p>
                        <p className="text-xs text-text-muted mt-0.5 truncate">{n.message}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-text-muted">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-2 h-5 w-px bg-border" />

        {/* User */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2.5 rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-[11px] font-bold">
              {user ? initials(user.fullName || user.name || "A") : <User size={13} />}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[13px] font-medium text-foreground leading-none">
                {user?.fullName || user?.name || "Admin"}
              </p>
              <p className="mt-0.5 text-[10px] text-text-muted capitalize">{user?.role || "admin"}</p>
            </div>
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-surface shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-foreground">{user?.fullName || user?.name || "Admin"}</p>
                <p className="text-xs text-text-muted">{user?.email || "admin@example.com"}</p>
              </div>
              <button className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:bg-surface-raised hover:text-foreground transition-colors">
                <Settings size={15} />
                <span>Ayarlar</span>
              </button>
              <button
                onClick={() => logout()}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-danger hover:bg-danger-soft transition-colors"
              >
                <LogOut size={15} />
                <span>Çıkış Yap</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

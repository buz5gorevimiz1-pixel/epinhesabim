"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCardSkeleton, ActivitySkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { dashboardApi } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import {
  Users, ShoppingCart, CreditCard, Package, Activity,
  Radio, HeadsetIcon, AlertTriangle, ShieldCheck,
  Wifi, Clock, Zap, Ban, CheckCircle, XCircle,
  ArrowUpRight, Monitor, Smartphone, Globe
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { connected, on } = useSocket({ type: "admin" });

  const [stats, setStats] = useState<import("@/types").DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [visitors, setVisitors] = useState<any[]>([]);
  const [visitorsLoading, setVisitorsLoading] = useState(true);

  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [supportLoading, setSupportLoading] = useState(true);

  const [activities, setActivities] = useState<import("@/types").Activity[]>([]);
  const [actLoading, setActLoading] = useState(true);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [fraudLoading, setFraudLoading] = useState(true);

  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [sysLoading, setSysLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const userName = user?.fullName || user?.name || "Admin";

  const fetchAll = async () => {
    try {
      setError(null);
      const [statsRes, visRes, supRes, actRes, ordRes, fraudRes, sysRes] = await Promise.all([
        dashboardApi.stats(),
        dashboardApi.visitors(),
        dashboardApi.supportQueue(),
        dashboardApi.activities(),
        dashboardApi.recentOrders(8),
        dashboardApi.fraudAlerts(),
        dashboardApi.systemStatus(),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      else setError(statsRes.error || "İstatistik alınamadı");

      if (visRes.success && visRes.data) setVisitors(visRes.data.visitors || []);
      if (supRes.success && supRes.data) {
        const waiting = supRes.data.queue || [];
        const active = supRes.data.active || [];
        setSupportTickets([...waiting, ...active]);
      }
      if (actRes.success && actRes.data) setActivities(actRes.data.activities || []);
      if (ordRes.success && ordRes.data) setRecentOrders(ordRes.data.orders || []);
      if (fraudRes.success && fraudRes.data) setFraudAlerts(fraudRes.data.alerts || []);
      if (sysRes.success && sysRes.data) setSystemStatus(sysRes.data);
    } catch (e) {
      setError("Bağlantı hatası");
    } finally {
      setStatsLoading(false);
      setVisitorsLoading(false);
      setSupportLoading(false);
      setActLoading(false);
      setOrdersLoading(false);
      setFraudLoading(false);
      setSysLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      fetchAll();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Realtime socket updates
  useEffect(() => {
    if (!connected) return;
    const unsubStats = on<import("@/types").DashboardStats>("dashboard:stats", (data) => {
      setStats((prev) => prev ? { ...prev, ...data } : data);
    });
    const unsubVisitors = on<any[]>("visitors:list", (data) => {
  setVisitors(data || []);
});

const unsubTickets = on<any[]>("support:tickets", (data) => {
  setSupportTickets(data || []);
});
    const unsubAdmin = on("admin:online", (count) => {
      setStats((prev) => prev ? { ...prev, adminOnline: count } : null);
    });
    return () => {
      unsubStats?.();
      unsubVisitors?.();
      unsubTickets?.();
      unsubAdmin?.();
    };
  }, [connected, on]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge variant="success" size="sm">Tamamlandı</Badge>;
      case "pending": return <Badge variant="warning" size="sm">Bekliyor</Badge>;
      case "cancelled": return <Badge variant="danger" size="sm">İptal</Badge>;
      default: return <Badge variant="accent" size="sm">{status}</Badge>;
    }
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "order": return <ShoppingCart size={13} />;
      case "user": return <Users size={13} />;
      case "audit": return <ShieldCheck size={13} />;
      case "listing": return <Package size={13} />;
      default: return <Activity size={13} />;
    }
  };

  const severityColor = (sev: string) => {
    switch (sev) {
      case "critical": return "text-danger border-danger/30 bg-danger/5";
      case "high": return "text-warning border-warning/30 bg-warning/5";
      default: return "text-info border-info/30 bg-info/5";
    }
  };

  const deviceIcon = (device: string) => {
    if (device === "Mobile") return <Smartphone size={12} />;
    if (device === "Tablet") return <Monitor size={12} />;
    return <Monitor size={12} />;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle size={32} className="text-danger mb-3" />
        <p className="text-sm text-text-muted">{error}</p>
        <button onClick={() => { setStatsLoading(true); setError(null); fetchAll(); }} className="mt-3 text-sm text-accent hover:text-accent-hover">Tekrar dene</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Operasyon Merkezi</h1>
          <p className="mt-0.5 text-sm text-text-muted">Hoş geldin, {userName}. Marketplace durumu burada.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "success" : "danger"} size="sm">
            {connected ? "Socket Bağlı" : "Socket Yok"}
          </Badge>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : [
              { label: "Toplam Kullanıcı", value: stats?.totalUsers ?? 0, icon: Users, accent: "text-accent", bg: "bg-accent/10" },
              { label: "Toplam Sipariş", value: stats?.totalOrders ?? 0, icon: ShoppingCart, accent: "text-success", bg: "bg-success/10" },
              { label: "Bugünkü Gelir", value: formatCurrency(stats?.todayRevenue ?? 0), icon: CreditCard, accent: "text-warning", bg: "bg-warning/10", raw: stats?.todayRevenue ?? 0 },
              { label: "Aktif İlan", value: stats?.activeListings ?? 0, icon: Package, accent: "text-info", bg: "bg-info/10" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} hover padding="md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-text-muted">{s.label}</p>
                      <p className="mt-1.5 text-2xl font-semibold text-foreground tracking-tight">{typeof s.value === "number" ? s.value.toLocaleString("tr-TR") : s.value}</p>
                    </div>
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", s.bg, s.accent)}>
                      <Icon size={16} />
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>

      {/* Main Content: Left + Right */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* LEFT COLUMN (3/5) */}
        <div className="lg:col-span-3 space-y-4">

          {/* Live Visitors */}
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-accent" />
                <div>
                  <CardTitle>Canlı Ziyaretçiler</CardTitle>
                  <CardDescription>Şu anda sitede aktif olan kullanıcılar</CardDescription>
                </div>
              </div>
              <Badge variant="success" size="sm">{visitors.length} aktif</Badge>
            </CardHeader>
            <CardContent>
              {visitorsLoading ? (
                <ActivitySkeleton count={4} />
              ) : visitors.length === 0 ? (
                <div className="py-6 text-center text-sm text-text-muted">Şu an aktif ziyaretçi yok</div>
              ) : (
                <div className="space-y-1 max-h-[220px] overflow-y-auto">
                  {visitors.slice(0, 8).map((v) => (
                    <div key={v.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-raised/50">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                        {deviceIcon(v.device)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{v.browser} · {v.device}</p>
                        <p className="text-[11px] text-text-muted truncate">{v.page || "/"} · {v.ip}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-text-muted">{Math.floor((v.onlineDuration || 0) / 60)}dk</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Support Queue */}
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <HeadsetIcon size={16} className="text-info" />
                <div>
                  <CardTitle>Destek Kuyruğu</CardTitle>
                  <CardDescription>Bekleyen ve aktif destek talepleri</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="warning" size="sm">
                  {supportTickets.filter((t) => t.status === "waiting").length} beklemede
                </Badge>
                <Badge variant="success" size="sm">
                  {supportTickets.filter((t) => t.status === "active").length} aktif
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {supportLoading ? (
                <ActivitySkeleton count={3} />
              ) : supportTickets.length === 0 ? (
                <div className="py-6 text-center text-sm text-text-muted">Destek talebi yok</div>
              ) : (
                <div className="space-y-1 max-h-[220px] overflow-y-auto">
                  {supportTickets.slice(0, 6).map((t) => (
                    <div key={t.ticketId} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-raised/50">
                      <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        t.status === "waiting" ? "bg-warning/10 text-warning" :
                        t.status === "active" ? "bg-success/10 text-success" :
                        "bg-accent/10 text-accent"
                      )}>
                        {t.status === "waiting" ? <Clock size={13} /> : <CheckCircle size={13} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {t.lastMessagePreview || t.subject || "Destek talebi"}
                        </p>
                        <p className="text-[11px] text-text-muted truncate">
                          {t.visitorBrowser} · {t.visitorDevice} · {t.messageCount} mesaj
                        </p>
                      </div>
                      <Badge
                        variant={t.status === "waiting" ? "warning" : t.status === "active" ? "success" : "accent"}
                        size="sm"
                      >
                        {t.status === "waiting" ? "Bekliyor" : t.status === "active" ? "Aktif" : "Kapalı"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-success" />
                <div>
                  <CardTitle>Son Siparişler</CardTitle>
                  <CardDescription>Son tamamlanan işlemler</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <ActivitySkeleton count={4} />
              ) : recentOrders.length === 0 ? (
                <div className="py-6 text-center text-sm text-text-muted">Henüz sipariş bulunmuyor</div>
              ) : (
                <div className="space-y-1 max-h-[240px] overflow-y-auto">
                  {recentOrders.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-raised/50">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                        <Package size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{o.productName}</p>
                        <p className="text-[11px] text-text-muted truncate">{o.buyer} → {o.seller || "Sistem"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-semibold text-foreground">₺{(o.price || 0).toLocaleString("tr-TR")}</p>
                        {statusBadge(o.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-text-muted" />
                <div>
                  <CardTitle>Son Aktiviteler</CardTitle>
                  <CardDescription>Audit log ve sistem olayları</CardDescription>
                </div>
              </div>
              <Badge variant="accent" size="sm">Canlı</Badge>
            </CardHeader>
            <CardContent>
              {actLoading ? (
                <ActivitySkeleton count={5} />
              ) : activities.length === 0 ? (
                <div className="py-6 text-center text-sm text-text-muted">Henüz aktivite bulunmuyor</div>
              ) : (
                <div className="space-y-1 max-h-[240px] overflow-y-auto">
                  {activities.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-raised/50">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                        {activityIcon(a.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{a.title}</p>
                        <p className="text-[11px] text-text-muted truncate">{a.description}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-text-muted">{formatDate(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN (2/5) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Fraud Alerts */}
          <Card padding="md" className="border-l-2 border-l-danger">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-danger" />
                <div>
                  <CardTitle>Fraud Uyarıları</CardTitle>
                  <CardDescription>Otomatik tespit edilen şüpheli işlemler</CardDescription>
                </div>
              </div>
              <Badge variant="danger" size="sm">{fraudAlerts.length} uyarı</Badge>
            </CardHeader>
            <CardContent>
              {fraudLoading ? (
                <ActivitySkeleton count={3} />
              ) : fraudAlerts.length === 0 ? (
                <div className="py-6 text-center">
                  <ShieldCheck size={24} className="text-success mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Aktif fraud uyarısı yok</p>
                  <p className="text-[11px] text-text-muted mt-0.5">Sistem güvenli</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {fraudAlerts.map((a) => (
                    <div key={a.id} className={cn("rounded-lg border p-2.5", severityColor(a.severity))}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[13px] font-semibold">{a.title}</p>
                        <span className="text-[10px] opacity-70">{formatDate(a.createdAt)}</span>
                      </div>
                      <p className="text-[12px] opacity-90 truncate">{a.description}</p>
                      <p className="text-[11px] opacity-60 mt-0.5">{a.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-warning" />
                <div>
                  <CardTitle>Sistem Durumu</CardTitle>
                  <CardDescription>Platform kontrolleri</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {sysLoading ? (
                <ActivitySkeleton count={4} />
              ) : (
                <>
                  <StatusRow
                    label="Bakım Modu"
                    active={systemStatus?.maintenanceMode}
                    activeText="Aktif"
                    inactiveText="Pasif"
                  />
                  <StatusRow
                    label="Canlı Destek"
                    active={systemStatus?.liveSupportEnabled}
                    activeText="Açık"
                    inactiveText="Kapalı"
                  />
                  <StatusRow
                    label="Popup Sistemi"
                    active={systemStatus?.popupEnabled}
                    activeText="Yayında"
                    inactiveText="Kapalı"
                  />
                  <StatusRow
                    label="Widget"
                    active={systemStatus?.widgetEnabled}
                    activeText="Aktif"
                    inactiveText="Devre Dışı"
                  />
                  <div className="mt-2 rounded-lg border border-border bg-surface-raised p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-text-secondary">Online Admin</span>
                      <span className="text-[13px] font-semibold text-foreground">{systemStatus?.onlineAdmins ?? 0}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(systemStatus?.adminSockets || []).map((a: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Admin {i + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Online Admins */}
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-success" />
                <div>
                  <CardTitle>Online Adminler</CardTitle>
                  <CardDescription>Aktif operasyon ekibi</CardDescription>
                </div>
              </div>
              <Badge variant="success" size="sm">{systemStatus?.onlineAdmins ?? 0} online</Badge>
            </CardHeader>
            <CardContent>
              {sysLoading ? (
                <ActivitySkeleton count={3} />
              ) : (systemStatus?.adminSockets || []).length === 0 ? (
                <div className="py-4 text-center text-sm text-text-muted">Şu an başka admin yok</div>
              ) : (
                <div className="space-y-1">
                  {(systemStatus?.adminSockets || []).map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                        <ShieldCheck size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground">Operatör {i + 1}</p>
                        <p className="text-[11px] text-text-muted truncate">{formatDate(a.connectedAt)}</p>
                      </div>
                      <span className="shrink-0 h-2 w-2 rounded-full bg-success" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-accent" />
                <div>
                  <CardTitle>Hızlı İşlemler</CardTitle>
                  <CardDescription>Sık kullanılan admin aksiyonları</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <QuickActionButton href="/users" icon={Users} label="Kullanıcı Ara" />
              <QuickActionButton href="/listings" icon={Package} label="İlan Onayla" />
              <QuickActionButton href="/finance" icon={CreditCard} label="Çekimleri Gör" />
              <QuickActionButton href="/audit" icon={ShieldCheck} label="Audit Log" />
              <QuickActionButton href="/live-support" icon={HeadsetIcon} label="Desteğe Git" />
              <QuickActionButton href="/fraud" icon={AlertTriangle} label="Fraud İncele" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, active, activeText, inactiveText }: { label: string; active?: boolean; activeText: string; inactiveText: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full", active ? "bg-warning" : "bg-success")} />
        <span className={cn("text-[12px] font-medium", active ? "text-warning" : "text-success")}>
          {active ? activeText : inactiveText}
        </span>
      </div>
    </div>
  );
}

function QuickActionButton({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2 py-3 text-center transition-colors hover:bg-surface-hover hover:border-border-strong"
    >
      <Icon size={16} className="text-accent" />
      <span className="text-[11px] font-medium text-foreground">{label}</span>
    </Link>
  );
}


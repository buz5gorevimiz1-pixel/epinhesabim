"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TablePagination, TableToolbar } from "@/components/ui/Table";
import { auditApi } from "@/lib/api";
import { Search, Filter } from "lucide-react";

const actionLabels: Record<string, string> = {
  USER_BAN: "Kullanıcı Engelleme",
  USER_UNBAN: "Kullanıcı Aktif Etme",
  USER_BALANCE_ADD: "Bakiye Ekleme",
  USER_BALANCE_DEDUCT: "Bakiye Çıkarma",
  USER_ROLE_CHANGE: "Rol Değişikliği",
  USER_DELETE: "Kullanıcı Silme",
  LISTING_APPROVE: "İlan Onaylama",
  LISTING_REJECT: "İlan Reddetme",
  LISTING_FEATURED: "Öne Çıkarma",
  LISTING_DELETE: "İlan Silme",
  WITHDRAWAL_APPROVE: "Çekim Onaylama",
  WITHDRAWAL_REJECT: "Çekim Reddetme",
  SETTINGS_UPDATE: "Ayar Güncelleme",
  POPUP_BROADCAST: "Popup Yayınlama",
  MAINTENANCE_TOGGLE: "Bakım Modu",
  LOGIN: "Giriş",
  LOGIN_FAILED: "Başarısız Giriş",
  LOGOUT: "Çıkış",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "30" };
    if (actionFilter) params.action = actionFilter;
    const res = await auditApi.list(params);
    if (res.success && res.data) {
      setLogs(res.data.logs);
      setTotalPages(res.data.pagination.totalPages);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    auditApi.actions().then((res) => { if (res.success && res.data) setActions(res.data.actions); });
  }, [page, actionFilter]);

  const columns = [
    { key: "action", title: "İşlem", render: (l: any) => (
      <div>
        <p className="text-[13px] font-medium text-foreground">{actionLabels[l.action] || l.action}</p>
        <p className="text-[11px] text-text-muted">{l.targetType} / {l.targetId?.slice(0, 12)}</p>
      </div>
    )},
    { key: "admin", title: "Admin", width: "160px", render: (l: any) => (
      <div>
        <p className="text-[13px] text-foreground">{l.adminEmail || l.adminId?.slice(0, 8)}</p>
        <Badge variant="muted" size="sm">{l.adminRole}</Badge>
      </div>
    )},
    { key: "ip", title: "IP / Cihaz", width: "140px", render: (l: any) => (
      <div>
        <p className="text-[11px] font-mono text-text-muted">{l.ip}</p>
        <p className="text-[10px] text-text-muted truncate">{l.userAgent?.split(" ")[0]}</p>
      </div>
    )},
    { key: "timestamp", title: "Tarih", width: "140px", render: (l: any) => (
      <span className="text-[12px] text-text-muted">{new Date(l.timestamp).toLocaleString("tr-TR")}</span>
    )},
  ];

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Audit Log</h1>
          <p className="mt-0.5 text-sm text-text-muted">Tüm admin işlemleri ve geçmişi</p>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        <TableToolbar>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-md border border-border bg-background pl-8 pr-3 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="h-8 rounded-md border border-border bg-background px-2 text-[13px]"
            >
              <option value="">Tüm İşlemler</option>
              {actions.map((a) => (
                <option key={a} value={a}>{actionLabels[a] || a}</option>
              ))}
            </select>
          </div>
        </TableToolbar>
        <Table
          columns={columns}
          data={logs}
          keyExtractor={(l) => l._id}
          loading={loading}
          emptyText="Kayıt bulunamadı."
        />
        <div className="px-4">
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={logs.length} />
        </div>
      </Card>
    </div>
  );
}

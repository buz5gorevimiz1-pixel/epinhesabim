"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TablePagination, TableToolbar } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useSocket } from "@/hooks/useSocket";
import { Monitor } from "lucide-react";

interface Visitor {
  id: string;
  ip: string;
  device: string;
  browser: string;
  page: string;
  referrer: string;
  connectedAt: number;
  lastActive: number;
  onlineDuration: number;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function VisitorsPage() {
  const { connected, on, emit } = useSocket({ type: "admin" });
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [adminCount, setAdminCount] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    const unsub1 = on<Visitor[]>("visitors:list", (list) => setVisitors(list));
    const unsub2 = on<number>("admin:online", (count) => setAdminCount(count));
    return () => { unsub1?.(); unsub2?.(); };
  }, [on]);

  const handleKick = (visitorId: string) => {
    emit("admin:kick-visitor", { visitorId });
  };

  const columns = [
    { key: "ip", title: "IP Adresi", width: "130px" },
    { key: "device", title: "Cihaz", width: "100px", render: (v: Visitor) => (
      <div className="flex items-center gap-1.5">
        <Monitor size={13} className="text-text-muted" />
        <span className="text-[13px]">{v.device}</span>
      </div>
    )},
    { key: "browser", title: "Tarayıcı", width: "110px" },
    { key: "page", title: "Aktif Sayfa", render: (v: Visitor) => (
      <span className="text-[13px] text-text-muted truncate max-w-[200px] block">{v.page}</span>
    )},
    { key: "referrer", title: "Referrer", render: (v: Visitor) => (
      <span className="text-[13px] text-text-muted truncate max-w-[140px] block">{v.referrer}</span>
    )},
    { key: "duration", title: "Online Süre", width: "100px", align: "right" as const, render: (v: Visitor) => (
      <span className="text-[13px] font-mono">{formatDuration(v.onlineDuration)}</span>
    )},
    { key: "actions", title: "", width: "80px", align: "right" as const, render: (v: Visitor) => (
      <Button variant="ghost" size="sm" onClick={() => handleKick(v.id)}>
        Çıkar
      </Button>
    )},
  ];

  const totalPages = Math.max(1, Math.ceil(visitors.length / perPage));
  const paginated = visitors.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Canlı Ziyaretçiler</h1>
          <p className="mt-0.5 text-sm text-text-muted">Realtime bağlı kullanıcılar</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "success" : "danger"} size="sm">
            {connected ? "Bağlı" : "Bağlantı Yok"}
          </Badge>
          <Badge variant="accent" size="sm">{adminCount} admin online</Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card padding="md">
          <p className="text-xs text-text-muted">Toplam Ziyaretçi</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{visitors.length}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-muted">Mobil</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {visitors.filter((v) => v.device === "Mobile").length}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-text-muted">Desktop</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {visitors.filter((v) => v.device === "Desktop").length}
          </p>
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <Table
          columns={columns}
          data={paginated}
          keyExtractor={(v) => v.id}
          emptyText="Aktif ziyaretçi bulunmuyor."
        />
        <div className="px-4">
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={visitors.length} />
        </div>
      </Card>
    </div>
  );
}

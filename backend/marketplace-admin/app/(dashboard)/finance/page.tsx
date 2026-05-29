"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TablePagination, TableToolbar } from "@/components/ui/Table";
import { financeApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { TrendingUp, AlertTriangle, Clock, Check, X, Search } from "lucide-react";

export default function FinancePage() {
  const { addToast } = useToast();
  const [stats, setStats] = useState({ totalVolume: 0, todayVolume: 0, flaggedCount: 0, pendingWithdrawals: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"transactions" | "withdrawals">("transactions");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const statsRes = await financeApi.stats();
    if (statsRes.success && statsRes.data) setStats(statsRes.data);

    if (activeTab === "transactions") {
      const res = await financeApi.transactions({ page: String(page), limit: "20" });
      if (res.success && res.data) { setTransactions(res.data.transactions); setTotalPages(res.data.pagination.totalPages); }
    } else {
      const res = await financeApi.withdrawals({ page: String(page), limit: "20" });
      if (res.success && res.data) { setWithdrawals(res.data.withdrawals); setTotalPages(res.data.pagination.totalPages); }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, activeTab]);

  const handleApproveWithdrawal = async (id: string) => {
    const res = await financeApi.approveWithdrawal(id);
    if (res.success) { addToast("Çekim onaylandı.", "success"); fetchData(); }
    else addToast(res.error || "Hata", "error");
  };

  const handleRejectWithdrawal = async () => {
    if (!selectedId) return;
    const res = await financeApi.rejectWithdrawal(selectedId, rejectReason);
    if (res.success) { addToast("Çekim reddedildi.", "success"); fetchData(); }
    else addToast(res.error || "Hata", "error");
    setRejectModalOpen(false);
    setRejectReason("");
    setSelectedId(null);
  };

  const txnColumns = [
    { key: "userEmail", title: "Kullanıcı", render: (t: any) => <span className="text-[13px] text-foreground">{t.userEmail || t.userId}</span> },
    { key: "type", title: "Tip", width: "100px", render: (t: any) => <Badge variant={t.type === "deposit" ? "success" : t.type === "withdrawal" ? "danger" : "accent"} size="sm">{t.type}</Badge> },
    { key: "amount", title: "Tutar", width: "120px", align: "right" as const, render: (t: any) => <span className="text-[13px] font-mono">{t.amount?.toLocaleString("tr-TR")} ₺</span> },
    { key: "status", title: "Durum", width: "100px", render: (t: any) => <Badge variant={t.status === "completed" ? "success" : t.status === "flagged" ? "warning" : t.status === "failed" ? "danger" : "muted"} size="sm">{t.status}</Badge> },
    { key: "createdAt", title: "Tarih", width: "120px", render: (t: any) => <span className="text-[12px] text-text-muted">{new Date(t.createdAt).toLocaleDateString("tr-TR")}</span> },
  ];

  const wdColumns = [
    { key: "userId", title: "Kullanıcı", render: (w: any) => <span className="text-[13px] text-foreground">{w.userId?.slice(0, 8)}</span> },
    { key: "amount", title: "Tutar", width: "120px", align: "right" as const, render: (w: any) => <span className="text-[13px] font-mono">{w.amount?.toLocaleString("tr-TR")} ₺</span> },
    { key: "method", title: "Yöntem", width: "100px", render: (w: any) => <span className="text-[13px] text-text-muted">{w.method || "-"}</span> },
    { key: "status", title: "Durum", width: "100px", render: (w: any) => <Badge variant={w.status === "approved" ? "success" : w.status === "rejected" ? "danger" : "warning"} size="sm">{w.status}</Badge> },
    { key: "actions", title: "", width: "100px", align: "right" as const, render: (w: any) => w.status === "pending" ? (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => handleApproveWithdrawal(w._id)} className="rounded-md p-1.5 text-text-muted hover:bg-success-soft hover:text-success transition-colors" title="Onayla"><Check size={14} /></button>
        <button onClick={() => { setSelectedId(w._id); setRejectModalOpen(true); }} className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger transition-colors" title="Reddet"><X size={14} /></button>
      </div>
    ) : null },
  ];

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Finans</h1>
          <p className="mt-0.5 text-sm text-text-muted">Bakiye hareketleri ve çekim talepleri</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card padding="md"><p className="text-xs text-text-muted">Toplam Hacim</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.totalVolume.toLocaleString("tr-TR")} ₺</p></Card>
        <Card padding="md"><p className="text-xs text-text-muted">Bugün</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.todayVolume.toLocaleString("tr-TR")} ₺</p></Card>
        <Card padding="md"><p className="text-xs text-text-muted">Şüpheli</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.flaggedCount}</p></Card>
        <Card padding="md"><p className="text-xs text-text-muted">Bekleyen Çekim</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.pendingWithdrawals}</p></Card>
      </div>

      <div className="flex items-center gap-2 border-b border-border">
        <button onClick={() => { setActiveTab("transactions"); setPage(1); }} className={`px-3 py-2 text-[13px] font-medium transition-colors ${activeTab === "transactions" ? "text-accent border-b-2 border-accent" : "text-text-muted hover:text-foreground"}`}>İşlemler</button>
        <button onClick={() => { setActiveTab("withdrawals"); setPage(1); }} className={`px-3 py-2 text-[13px] font-medium transition-colors ${activeTab === "withdrawals" ? "text-accent border-b-2 border-accent" : "text-text-muted hover:text-foreground"}`}>Çekim Talepleri</button>
      </div>

      <Card padding="none" className="overflow-hidden">
        {activeTab === "transactions" ? (
          <Table columns={txnColumns} data={transactions} keyExtractor={(t) => t._id} loading={loading} emptyText="İşlem bulunamadı." />
        ) : (
          <Table columns={wdColumns} data={withdrawals} keyExtractor={(w) => w._id} loading={loading} emptyText="Çekim talebi bulunamadı." />
        )}
        <div className="px-4">
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={activeTab === "transactions" ? transactions.length : withdrawals.length} />
        </div>
      </Card>

      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Çekimi Reddet" size="sm">
        <div className="space-y-3">
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reddetme sebebi..." rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none resize-none" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRejectModalOpen(false)}>İptal</Button>
            <Button variant="danger" size="sm" onClick={handleRejectWithdrawal}>Reddet</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

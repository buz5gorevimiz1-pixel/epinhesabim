"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TablePagination, TableToolbar } from "@/components/ui/Table";
import { listingsApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Check, X, Star, Search } from "lucide-react";

export default function ListingsPage() {
  const { addToast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, featured: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20", status: statusFilter };
    if (search) params.search = search;
    const res = await listingsApi.list(params);
    if (res.success && res.data) {
      setListings(res.data.listings);
      setTotalPages(res.data.pagination.totalPages);
    }
    const statsRes = await listingsApi.stats();
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, [page, statusFilter]);

  const handleApprove = async (id: string) => {
    const res = await listingsApi.approve(id);
    if (res.success) { addToast("İlan onaylandı.", "success"); fetchListings(); }
    else addToast(res.error || "Hata", "error");
  };

  const handleReject = async () => {
    if (!selectedId) return;
    const res = await listingsApi.reject(selectedId, rejectReason);
    if (res.success) { addToast("İlan reddedildi.", "success"); fetchListings(); }
    else addToast(res.error || "Hata", "error");
    setRejectModalOpen(false);
    setRejectReason("");
    setSelectedId(null);
  };

  const handleFeature = async (id: string, featured: boolean) => {
    const res = await listingsApi.feature(id, featured);
    if (res.success) { addToast(featured ? "Öne çıkarıldı." : "Öne çıkarma kaldırıldı.", "success"); fetchListings(); }
  };

  const columns = [
    { key: "title", title: "İlan", render: (l: any) => <span className="text-[13px] font-medium text-foreground">{l.title}</span> },
    { key: "category", title: "Kategori", width: "120px", render: (l: any) => <span className="text-[13px] text-text-muted">{l.category || "-"}</span> },
    { key: "price", title: "Fiyat", width: "100px", align: "right" as const, render: (l: any) => <span className="text-[13px] font-mono">{l.price?.toLocaleString("tr-TR") || "-"} ₺</span> },
    { key: "status", title: "Durum", width: "100px", render: (l: any) => (
      <Badge variant={l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning"} size="sm">
        {l.status === "approved" ? "Onaylı" : l.status === "rejected" ? "Reddedildi" : "Beklemede"}
      </Badge>
    )},
    { key: "actions", title: "", width: "140px", align: "right" as const, render: (l: any) => (
      <div className="flex items-center justify-end gap-1">
        {l.status === "pending" && (
          <>
            <button onClick={() => handleApprove(l._id)} className="rounded-md p-1.5 text-text-muted hover:bg-success-soft hover:text-success transition-colors" title="Onayla">
              <Check size={14} />
            </button>
            <button onClick={() => { setSelectedId(l._id); setRejectModalOpen(true); }} className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger transition-colors" title="Reddet">
              <X size={14} />
            </button>
          </>
        )}
        <button onClick={() => handleFeature(l._id, !l.featured)} className={`rounded-md p-1.5 transition-colors ${l.featured ? "text-accent bg-accent-soft" : "text-text-muted hover:bg-accent-soft hover:text-accent"}`} title="Öne Çıkar">
          <Star size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">İlan Moderasyonu</h1>
          <p className="mt-0.5 text-sm text-text-muted">İlanları onayla, reddet ve yönet</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card padding="md"><p className="text-xs text-text-muted">Bekleyen</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.pending}</p></Card>
        <Card padding="md"><p className="text-xs text-text-muted">Onaylı</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.approved}</p></Card>
        <Card padding="md"><p className="text-xs text-text-muted">Reddedildi</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.rejected}</p></Card>
        <Card padding="md"><p className="text-xs text-text-muted">Öne Çıkan</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.featured}</p></Card>
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
                onKeyDown={(e) => e.key === "Enter" && fetchListings()}
                className="h-8 rounded-md border border-border bg-background pl-8 pr-3 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-8 rounded-md border border-border bg-background px-2 text-[13px]">
              <option value="pending">Bekleyen</option>
              <option value="approved">Onaylı</option>
              <option value="rejected">Reddedildi</option>
              <option value="all">Tümü</option>
            </select>
          </div>
        </TableToolbar>
        <Table columns={columns} data={listings} keyExtractor={(l) => l._id} loading={loading} emptyText="İlan bulunamadı." />
        <div className="px-4">
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={listings.length} />
        </div>
      </Card>

      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="İlanı Reddet" size="sm">
        <div className="space-y-3">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reddetme sebebi..."
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRejectModalOpen(false)}>İptal</Button>
            <Button variant="danger" size="sm" onClick={handleReject}>Reddet</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

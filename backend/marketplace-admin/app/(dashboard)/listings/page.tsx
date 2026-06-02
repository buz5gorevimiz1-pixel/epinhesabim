"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TablePagination, TableToolbar } from "@/components/ui/Table";
import { listingsApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Check, X, Star, Search, Eye, EyeOff, Trash2, AlertTriangle } from "lucide-react";

export default function ListingsPage() {
  const { addToast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, active: 0, hidden: 0, removed: 0, featured: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState("");

  const fetchListings = async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (statusFilter !== "all") params.status = statusFilter;
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

  const handleActivate = async (id: string) => {
    const res = await listingsApi.activate(id);
    if (res.success) { addToast("İlan aktif edildi.", "success"); fetchListings(); }
    else addToast(res.error || "Hata", "error");
  };

  const handleHide = async (id: string) => {
    const res = await listingsApi.hide(id);
    if (res.success) { addToast("İlan gizlendi.", "success"); fetchListings(); }
    else addToast(res.error || "Hata", "error");
  };

  const handleRemove = async () => {
    if (!selectedId) return;
    const res = await listingsApi.remove(selectedId, removeReason);
    if (res.success) { addToast("İlan kaldırıldı.", "success"); fetchListings(); }
    else addToast(res.error || "Hata", "error");
    setRemoveModalOpen(false);
    setRemoveReason("");
    setSelectedId(null);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const res = await listingsApi.delete(selectedId);
    if (res.success) { addToast("İlan kalıcı olarak silindi.", "success"); fetchListings(); }
    else addToast(res.error || "Hata", "error");
    setDeleteModalOpen(false);
    setSelectedId(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      pending: { variant: "warning", label: "Beklemede" },
      approved: { variant: "success", label: "Onaylı" },
      rejected: { variant: "danger", label: "Reddedildi" },
      active: { variant: "success", label: "Yayında" },
      hidden: { variant: "warning", label: "Gizli" },
      removed: { variant: "danger", label: "Kaldırıldı" },
    };
    const config = statusConfig[status] || { variant: "warning", label: status };
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const columns = [
    { key: "id", title: "ID", width: "80px", render: (l: any) => <span className="text-[11px] text-text-muted font-mono">{l._id?.slice(-6) || "-"}</span> },
    { key: "title", title: "İlan Başlığı", render: (l: any) => <span className="text-[13px] font-medium text-foreground">{l.title}</span> },
    { key: "category", title: "Kategori", width: "120px", render: (l: any) => <span className="text-[13px] text-text-muted">{l.category || "-"}</span> },
    { key: "seller", title: "Satıcı", width: "120px", render: (l: any) => <span className="text-[13px] text-text-muted">{l.sellerName || "-"}</span> },
    { key: "createdAt", title: "Oluşturulma Tarihi", width: "120px", render: (l: any) => <span className="text-[13px] text-text-muted">{l.createdAt ? new Date(l.createdAt).toLocaleDateString("tr-TR") : "-"}</span> },
    { key: "status", title: "Durum", width: "100px", render: (l: any) => getStatusBadge(l.status) },
    { key: "actions", title: "", width: "180px", align: "right" as const, render: (l: any) => (
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
        {l.status !== "pending" && (
          <>
            <button onClick={() => handleActivate(l._id)} className="rounded-md p-1.5 text-text-muted hover:bg-success-soft hover:text-success transition-colors" title="Aktif Et">
              <Eye size={14} />
            </button>
            <button onClick={() => handleHide(l._id)} className="rounded-md p-1.5 text-text-muted hover:bg-warning-soft hover:text-warning transition-colors" title="Gizle">
              <EyeOff size={14} />
            </button>
            <button onClick={() => { setSelectedId(l._id); setRemoveModalOpen(true); }} className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger transition-colors" title="Kaldır">
              <AlertTriangle size={14} />
            </button>
          </>
        )}
        <button onClick={() => handleFeature(l._id, !l.featured)} className={`rounded-md p-1.5 transition-colors ${l.featured ? "text-accent bg-accent-soft" : "text-text-muted hover:bg-accent-soft hover:text-accent"}`} title="Öne Çıkar">
          <Star size={14} />
        </button>
        <button onClick={() => { setSelectedId(l._id); setDeleteModalOpen(true); }} className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger transition-colors" title="Kalıcı Sil">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">İlan Moderasyonu</h1>
          <p className="mt-0.5 text-sm text-text-muted">İlanları yönet, gizle, kaldır ve sil</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card padding="md"><p className="text-xs text-text-muted">Bekleyen</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.pending}</p></Card>
        <Card padding="md"><p className="text-xs text-text-muted">Yayında</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.active}</p></Card>
        <Card padding="md"><p className="text-xs text-text-muted">Gizli</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.hidden}</p></Card>
        <Card padding="md"><p className="text-xs text-text-muted">Kaldırılan</p><p className="mt-1 text-2xl font-semibold text-foreground">{stats.removed}</p></Card>
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
              <option value="all">Tüm İlanlar</option>
              <option value="active">Aktif İlanlar</option>
              <option value="hidden">Gizli İlanlar</option>
              <option value="removed">Kaldırılan İlanlar</option>
              <option value="pending">Bekleyen</option>
              <option value="approved">Onaylı</option>
              <option value="rejected">Reddedildi</option>
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

      <Modal isOpen={removeModalOpen} onClose={() => setRemoveModalOpen(false)} title="İlanı Kaldır" size="sm">
        <div className="space-y-3">
          <textarea
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            placeholder="Kaldırma sebebi..."
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRemoveModalOpen(false)}>İptal</Button>
            <Button variant="danger" size="sm" onClick={handleRemove}>Kaldır</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Kalıcı Sil" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-text-muted">Bu ilanı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>İptal</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>Kalıcı Sil</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

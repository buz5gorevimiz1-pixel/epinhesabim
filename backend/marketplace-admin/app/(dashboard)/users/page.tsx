"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TablePagination, TableToolbar } from "@/components/ui/Table";
import { usersApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { Search, Ban, ShieldCheck, Wallet, Trash2 } from "lucide-react";
import type { User, UserRole } from "@/types";

const roleLabels: Record<UserRole, string> = {
  user: "Kullanıcı",
  admin: "Admin",
  super_admin: "Super Admin",
  support_admin: "Destek",
  moderator: "Moderatör",
  finance_admin: "Finans",
  security_admin: "Güvenlik",
};

const statusColors = {
  active: "success" as const,
  pending: "warning" as const,
  banned: "danger" as const,
};

export default function UsersPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"add" | "deduct">("add");
  const [balanceReason, setBalanceReason] = useState("");

  const isSuperAdmin = currentUser?.role === "super_admin";

  const fetchUsers = async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (roleFilter) params.role = roleFilter;
    const res = await usersApi.list(params);
    if (res.success && res.data) {
      setUsers(res.data.users);
      setTotalPages(res.data.pagination.totalPages);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleBan = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.status === "banned" ? "active" : "banned";
    const res = await usersApi.updateStatus(selectedUser.id, newStatus, "Admin işlemi");
    if (res.success) {
      addToast(`Kullanıcı ${newStatus === "banned" ? "engellendi" : "aktif edildi"}.`, "success");
      fetchUsers();
    } else {
      addToast(res.error || "İşlem başarısız.", "error");
    }
    setBanModalOpen(false);
    setSelectedUser(null);
  };

  const handleBalance = async () => {
    if (!selectedUser || !balanceAmount) return;
    const res = await usersApi.updateBalance(selectedUser.id, parseFloat(balanceAmount), balanceType, balanceReason);
    if (res.success) {
      addToast("Bakiye güncellendi.", "success");
      fetchUsers();
    } else {
      addToast(res.error || "İşlem başarısız.", "error");
    }
    setBalanceModalOpen(false);
    setBalanceAmount("");
    setBalanceReason("");
    setSelectedUser(null);
  };

  const columns = [
    { key: "name", title: "Kullanıcı", render: (u: User) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-bold">
          {(u.fullName || u.name || "?").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-medium text-foreground">{u.fullName || u.name}</p>
          <p className="text-[11px] text-text-muted">{u.email}</p>
        </div>
      </div>
    )},
    { key: "role", title: "Rol", width: "120px", render: (u: User) => (
      <Badge variant={u.role === "user" ? "muted" : "accent"} size="sm">{roleLabels[u.role] || u.role}</Badge>
    )},
    { key: "status", title: "Durum", width: "100px", render: (u: User) => (
      <Badge variant={statusColors[u.status || "active"] || "muted"} size="sm">{u.status === "banned" ? "Engelli" : u.status === "pending" ? "Beklemede" : "Aktif"}</Badge>
    )},
    { key: "balance", title: "Bakiye", width: "120px", align: "right" as const, render: (u: User) => (
      <span className="text-[13px] font-mono">{u.balance?.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) || "₺0,00"}</span>
    )},
    { key: "createdAt", title: "Kayıt", width: "120px", render: (u: User) => (
      <span className="text-[12px] text-text-muted">{new Date(u.createdAt).toLocaleDateString("tr-TR")}</span>
    )},
    { key: "actions", title: "", width: "160px", align: "right" as const, render: (u: User) => (
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setBanModalOpen(true); }}
          className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger transition-colors"
          title={u.status === "banned" ? "Aktif Et" : "Engelle"}
        >
          <Ban size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setBalanceModalOpen(true); }}
          className="rounded-md p-1.5 text-text-muted hover:bg-accent-soft hover:text-accent transition-colors"
          title="Bakiye"
        >
          <Wallet size={14} />
        </button>
        {isSuperAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); /* delete logic */ }}
            className="rounded-md p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger transition-colors"
            title="Sil"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Kullanıcılar</h1>
          <p className="mt-0.5 text-sm text-text-muted">Tüm kullanıcıları yönetin</p>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        <TableToolbar>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
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
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-border-strong focus:outline-none"
            >
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="pending">Beklemede</option>
              <option value="banned">Engelli</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-border-strong focus:outline-none"
            >
              <option value="">Tüm Roller</option>
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </form>
        </TableToolbar>
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          loading={loading}
          onRowClick={(u) => router.push(`/users/${u.id}`)}
          emptyText="Kullanıcı bulunamadı."
        />
        <div className="px-4">
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={users.length} />
        </div>
      </Card>

      {/* Ban Modal */}
      <Modal
        isOpen={banModalOpen}
        onClose={() => setBanModalOpen(false)}
        title={selectedUser?.status === "banned" ? "Kullanıcıyı Aktif Et" : "Kullanıcıyı Engelle"}
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            {selectedUser?.fullName || selectedUser?.name} kullanıcısını {selectedUser?.status === "banned" ? "aktif etmek" : "engellemek"} istediğinize emin misiniz?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setBanModalOpen(false)}>İptal</Button>
            <Button variant={selectedUser?.status === "banned" ? "primary" : "danger"} size="sm" onClick={handleBan}>
              {selectedUser?.status === "banned" ? "Aktif Et" : "Engelle"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Balance Modal */}
      <Modal
        isOpen={balanceModalOpen}
        onClose={() => setBalanceModalOpen(false)}
        title="Bakiye Yönetimi"
        size="sm"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBalanceType("add")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${balanceType === "add" ? "border-accent bg-accent-soft text-accent" : "border-border text-text-secondary hover:bg-surface-raised"}`}
            >
              Ekle
            </button>
            <button
              onClick={() => setBalanceType("deduct")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${balanceType === "deduct" ? "border-danger bg-danger-soft text-danger" : "border-border text-text-secondary hover:bg-surface-raised"}`}
            >
              Çıkar
            </button>
          </div>
          <input
            type="number"
            value={balanceAmount}
            onChange={(e) => setBalanceAmount(e.target.value)}
            placeholder="Tutar (₺)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          <input
            type="text"
            value={balanceReason}
            onChange={(e) => setBalanceReason(e.target.value)}
            placeholder="Açıklama (opsiyonel)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setBalanceModalOpen(false)}>İptal</Button>
            <Button variant="primary" size="sm" onClick={handleBalance} disabled={!balanceAmount}>Uygula</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

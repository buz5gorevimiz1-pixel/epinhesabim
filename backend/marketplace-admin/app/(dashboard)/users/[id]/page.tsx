"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { usersApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { ArrowLeft, Mail, Phone, Shield, Calendar, Wallet } from "lucide-react";
import type { User } from "@/types";

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    usersApi.detail(String(id)).then((res) => {
      if (res.success && res.data) {
        setUser(res.data.user);
        setAuditLogs(res.data.auditLogs || []);
        setTransactions(res.data.transactions || []);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-text-muted">Kullanıcı bulunamadı.</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => router.push("/users")}>
          <ArrowLeft size={14} className="mr-1" /> Geri
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[900px]">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/users")}>
          <ArrowLeft size={14} />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{user.fullName || user.name}</h1>
          <p className="text-sm text-text-muted">Kullanıcı detayları</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile */}
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent text-lg font-bold">
              {(user.fullName || user.name).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{user.fullName || user.name}</p>
              <Badge variant={user.status === "active" ? "success" : user.status === "banned" ? "danger" : "warning"} size="sm">
                {user.status === "active" ? "Aktif" : user.status === "banned" ? "Engelli" : "Beklemede"}
              </Badge>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <Mail size={14} className="text-text-muted" />
              {user.email}
            </div>
            {user.phone && (
              <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                <Phone size={14} className="text-text-muted" />
                {user.phone}
              </div>
            )}
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <Shield size={14} className="text-text-muted" />
              {user.role}
            </div>
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <Calendar size={14} className="text-text-muted" />
              {new Date(user.createdAt).toLocaleDateString("tr-TR")}
            </div>
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <Wallet size={14} className="text-text-muted" />
              {user.balance?.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) || "₺0,00"}
            </div>
          </div>
        </Card>

        {/* Transactions */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <div>
              <CardTitle>Son İşlemler</CardTitle>
              <CardDescription>Bakiye hareketleri</CardDescription>
            </div>
          </CardHeader>
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">İşlem bulunmuyor.</p>
          ) : (
            <div className="space-y-1">
              {transactions.map((t) => (
                <div key={t._id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-raised/50">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{t.description || t.type}</p>
                    <p className="text-[11px] text-text-muted">{new Date(t.createdAt).toLocaleDateString("tr-TR")}</p>
                  </div>
                  <Badge variant={t.type === "penalty" || t.amount < 0 ? "danger" : t.type === "bonus" ? "success" : "accent"} size="sm">
                    {t.amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Audit Logs */}
      <Card padding="md">
        <CardHeader>
          <div>
            <CardTitle>İşlem Geçmişi</CardTitle>
            <CardDescription>Admin tarafından yapılan işlemler</CardDescription>
          </div>
        </CardHeader>
        {auditLogs.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-muted">Kayıt bulunmuyor.</p>
        ) : (
          <div className="space-y-1">
            {auditLogs.map((log) => (
              <div key={log._id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-raised/50">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{log.action}</p>
                  <p className="text-[11px] text-text-muted">{new Date(log.timestamp).toLocaleString("tr-TR")}</p>
                </div>
                <span className="text-[11px] text-text-muted font-mono">{log.ip}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

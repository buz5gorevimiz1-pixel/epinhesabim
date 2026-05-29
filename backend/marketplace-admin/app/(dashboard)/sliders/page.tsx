"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { sliderApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import {
  Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, ImageIcon,
  Monitor, Smartphone, ArrowUpDown
} from "lucide-react";

interface Slider {
  _id: string;
  title: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  desktopImage?: string;
  mobileImage?: string;
  active: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
  accentColor?: string;
  glowColor?: string;
}

const emptyForm: Partial<Slider> = {
  title: "",
  description: "",
  buttonText: "Hemen Başla",
  buttonLink: "#",
  desktopImage: "",
  mobileImage: "",
  active: true,
  accentColor: "#06b6d4",
  glowColor: "rgba(6,182,212,0.3)",
};

export default function SlidersPage() {
  const { addToast } = useToast();
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Slider | null>(null);
  const [form, setForm] = useState<Partial<Slider>>(emptyForm);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const fetchSliders = useCallback(async () => {
    setLoading(true);
    const res = await sliderApi.list();
    if (res.success && res.data) {
      setSliders(res.data.sliders || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSliders();
  }, [fetchSliders]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: Slider) => {
    setEditing(s);
    setForm({ ...s });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const save = async () => {
    if (!form.title) {
      addToast("Başlık zorunlu", "error");
      return;
    }
    if (editing) {
      const res = await sliderApi.update(editing._id, form);
      if (res.success) {
        addToast("Slider güncellendi", "success");
        closeModal();
        fetchSliders();
      } else {
        addToast(res.error || "Hata oluştu", "error");
      }
    } else {
      const res = await sliderApi.create(form);
      if (res.success) {
        addToast("Slider oluşturuldu", "success");
        closeModal();
        fetchSliders();
      } else {
        addToast(res.error || "Hata oluştu", "error");
      }
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Silmek istediğinize emin misiniz?")) return;
    const res = await sliderApi.delete(id);
    if (res.success) {
      addToast("Slider silindi", "success");
      fetchSliders();
    }
  };

  const toggleActive = async (s: Slider) => {
    const res = await sliderApi.update(s._id, { active: !s.active });
    if (res.success) {
      addToast(s.active ? "Pasif yapıldı" : "Aktif yapıldı", "success");
      fetchSliders();
    }
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newList = [...sliders];
    const [removed] = newList.splice(dragIdx, 1);
    newList.splice(idx, 0, removed);
    setSliders(newList);
    setDragIdx(idx);
  };
  const handleDragEnd = async () => {
    setDragIdx(null);
    const orders = sliders.map((s, i) => ({ id: s._id, order: i + 1 }));
    await sliderApi.reorder(orders);
    addToast("Sıralama güncellendi", "success");
  };

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Homepage Builder</h1>
          <p className="mt-0.5 text-sm text-text-muted">Hero slider yönetimi</p>
        </div>
        <Button size="sm" variant="primary" onClick={openCreate}>
          <Plus size={14} className="mr-1.5" /> Yeni Slider
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-text-muted">Yükleniyor...</div>
      ) : sliders.length === 0 ? (
        <div className="py-12 text-center text-sm text-text-muted">Henüz slider yok</div>
      ) : (
        <div className="space-y-2">
          {sliders.map((s, idx) => (
            <div
              key={s._id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong cursor-move"
            >
              <GripVertical size={16} className="text-text-muted shrink-0" />

              <div className="shrink-0 w-16 h-10 rounded bg-surface-raised flex items-center justify-center overflow-hidden">
                {s.desktopImage ? (
                  <img src={s.desktopImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={16} className="text-text-muted" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-foreground truncate">{s.title}</p>
                  {s.active ? (
                    <Badge variant="success" size="sm">Aktif</Badge>
                  ) : (
                    <Badge variant="accent" size="sm">Pasif</Badge>
                  )}
                </div>
                <p className="text-[11px] text-text-muted truncate mt-0.5">
                  {s.buttonText} → {s.buttonLink}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="w-4 h-4 rounded-full border border-white/10"
                  style={{ backgroundColor: s.accentColor }}
                  title="Accent"
                />
                <Button size="xs" variant="ghost" onClick={() => toggleActive(s)} title={s.active ? "Pasif yap" : "Aktif yap"}>
                  {s.active ? <Eye size={14} /> : <EyeOff size={14} />}
                </Button>
                <Button size="xs" variant="ghost" onClick={() => openEdit(s)}>
                  <Pencil size={14} />
                </Button>
                <Button size="xs" variant="ghost" className="text-danger" onClick={() => remove(s._id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editing ? "Slider Düzenle" : "Yeni Slider"}
            </h2>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[12px] font-medium text-text-secondary mb-1">Başlık *</label>
                <input
                  type="text"
                  value={form.title || ""}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
                  placeholder="Slider başlığı"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-secondary mb-1">Açıklama</label>
                <textarea
                  value={form.description || ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
                  placeholder="Kısa açıklama"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Buton Yazısı</label>
                  <input
                    type="text"
                    value={form.buttonText || ""}
                    onChange={(e) => setForm((f) => ({ ...f, buttonText: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Buton Linki</label>
                  <input
                    type="text"
                    value={form.buttonLink || ""}
                    onChange={(e) => setForm((f) => ({ ...f, buttonLink: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Desktop Görsel URL</label>
                  <input
                    type="text"
                    value={form.desktopImage || ""}
                    onChange={(e) => setForm((f) => ({ ...f, desktopImage: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Mobil Görsel URL</label>
                  <input
                    type="text"
                    value={form.mobileImage || ""}
                    onChange={(e) => setForm((f) => ({ ...f, mobileImage: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Accent Rengi</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.accentColor || "#06b6d4"}
                      onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                      className="w-10 h-8 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={form.accentColor || ""}
                      onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-border-strong focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Glow Rengi</label>
                  <input
                    type="text"
                    value={form.glowColor || ""}
                    onChange={(e) => setForm((f) => ({ ...f, glowColor: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-border-strong focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={form.startDate ? form.startDate.split("T")[0] : ""}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-border-strong focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-text-secondary mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={form.endDate ? form.endDate.split("T")[0] : ""}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-border-strong focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="slider-active"
                  checked={!!form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-border bg-background text-accent focus:ring-accent/20"
                />
                <label htmlFor="slider-active" className="text-[13px] text-foreground">Aktif</label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={closeModal}>İptal</Button>
              <Button size="sm" variant="primary" onClick={save}>
                {editing ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

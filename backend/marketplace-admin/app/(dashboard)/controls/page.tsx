"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/context/ToastContext";
import { ToggleLeft, ToggleRight, AlertTriangle, Megaphone, HeadsetIcon, Puzzle, Power } from "lucide-react";

interface SystemState {
  maintenanceMode: boolean;
  liveSupportEnabled: boolean;
  popupEnabled: boolean;
  popupMessage: string;
  widgetEnabled: boolean;
}

export default function ControlsPage() {
  const { connected, on, emit } = useSocket({ type: "admin" });
  const { addToast } = useToast();
  const [state, setState] = useState<SystemState>({
    maintenanceMode: false,
    liveSupportEnabled: true,
    popupEnabled: false,
    popupMessage: "",
    widgetEnabled: true,
  });
  const [popupModalOpen, setPopupModalOpen] = useState(false);
  const [popupText, setPopupText] = useState("");

  useEffect(() => {
    const unsub = on<SystemState>("system:state", (s) => setState(s));
    return () => unsub?.();
  }, [on]);

  const toggle = (key: keyof SystemState, label: string) => {
    const value = !state[key];
    if (key === "maintenanceMode") emit("admin:maintenance", { enabled: value });
    if (key === "liveSupportEnabled") emit("admin:livesupport", { enabled: value });
    if (key === "widgetEnabled") emit("admin:widget", { enabled: value });
    setState((s) => ({ ...s, [key]: value }));
    addToast(`${label} ${value ? "aktif" : "pasif"} edildi.`, value ? "success" : "info");
  };

  const sendPopup = () => {
    emit("admin:popup", { enabled: true, message: popupText });
    setState((s) => ({ ...s, popupEnabled: true, popupMessage: popupText }));
    setPopupModalOpen(false);
    setPopupText("");
    addToast("Popup yayınlandı.", "success");
  };

  const hidePopup = () => {
    emit("admin:popup", { enabled: false, message: "" });
    setState((s) => ({ ...s, popupEnabled: false, popupMessage: "" }));
    addToast("Popup gizlendi.", "info");
  };

  const controls = [
    {
      key: "maintenanceMode" as const,
      label: "Bakım Modu",
      description: "Siteyi bakım moduna alır. Ziyaretçiler erişemez.",
      icon: AlertTriangle,
      danger: true,
    },
    {
      key: "liveSupportEnabled" as const,
      label: "Canlı Destek",
      description: "Ziyaretçiler destek talebi oluşturabilir.",
      icon: HeadsetIcon,
      danger: false,
    },
    {
      key: "widgetEnabled" as const,
      label: "Widget",
      description: "Canlı destek widget'ını sitede göster.",
      icon: Puzzle,
      danger: false,
    },
  ];

  return (
    <div className="space-y-4 max-w-[800px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Kontrol Merkezi</h1>
          <p className="mt-0.5 text-sm text-text-muted">Sistem ayarlarını yönetin</p>
        </div>
        <Badge variant={connected ? "success" : "danger"} size="sm">
          {connected ? "Bağlı" : "Bağlantı Yok"}
        </Badge>
      </div>

      <div className="space-y-3">
        {controls.map((ctrl) => {
          const Icon = ctrl.icon;
          const active = state[ctrl.key];
          return (
            <Card key={ctrl.key} padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? (ctrl.danger ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent") : "bg-surface-raised text-text-muted"}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{ctrl.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{ctrl.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(ctrl.key, ctrl.label)}
                  className="shrink-0"
                >
                  {active ? (
                    <ToggleRight size={28} className={ctrl.danger ? "text-danger" : "text-accent"} />
                  ) : (
                    <ToggleLeft size={28} className="text-text-muted" />
                  )}
                </button>
              </div>
            </Card>
          );
        })}

        {/* Popup Control */}
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${state.popupEnabled ? "bg-accent-soft text-accent" : "bg-surface-raised text-text-muted"}`}>
                <Megaphone size={18} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Popup Duyuru</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {state.popupEnabled ? `Yayında: "${state.popupMessage.slice(0, 40)}${state.popupMessage.length > 40 ? "..." : ""}"` : "Sitede popup gösterimi kapalı"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {state.popupEnabled && (
                <Button variant="ghost" size="sm" onClick={hidePopup}>
                  Gizle
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setPopupModalOpen(true)}>
                {state.popupEnabled ? "Düzenle" : "Yayınla"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Popup Modal */}
      <Modal
        isOpen={popupModalOpen}
        onClose={() => setPopupModalOpen(false)}
        title="Popup Duyuru"
        description="Tüm ziyaretçilere gösterilecek mesaj"
        size="md"
      >
        <div className="space-y-3">
          <textarea
            value={popupText}
            onChange={(e) => setPopupText(e.target.value)}
            placeholder="Örn: Sistem bakımı 22:00 - 23:00 arası yapılacaktır."
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPopupModalOpen(false)}>İptal</Button>
            <Button variant="primary" size="sm" onClick={sendPopup} disabled={!popupText.trim()}>
              Yayınla
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

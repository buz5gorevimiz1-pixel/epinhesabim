"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useSocket } from "@/hooks/useSocket";
import { HeadsetIcon, MessageSquare, Send, X, Clock, RotateCcw } from "lucide-react";

interface Ticket {
  _id: string;
  ticketId: string;
  visitorIp: string;
  visitorBrowser: string;
  visitorDevice: string;
  visitorPage: string;
  subject: string;
  status: "waiting" | "active" | "closed";
  priority: string;
  assignedAdminName?: string;
  messageCount: number;
  unreadByAdmin: boolean;
  unreadByVisitor: number;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
}

interface DbMessage {
  _id: string;
  ticketId: string;
  sender: "visitor" | "admin" | "system";
  senderName?: string;
  text: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  sender: "visitor" | "admin";
  text: string;
  timestamp: string;
}

export default function LiveSupportPage() {
  const { connected, on, emit } = useSocket({ type: "admin" });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<"all" | "waiting" | "active" | "closed">("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedTicket = tickets.find((t) => t.ticketId === selectedTicketId);

  useEffect(() => {
    const unsub1 = on<Ticket[]>("support:tickets", (list) => setTickets(list));
    const unsub2 = on<{ ticketId: string; messages: DbMessage[] }>("support:history", (data) => {
      if (data.ticketId === selectedTicketId) {
        setMessages(
          data.messages.map((m) => ({
            id: m._id || String(Math.random()),
            sender: m.sender === "admin" ? "admin" : "visitor",
            text: m.text,
            timestamp: m.createdAt,
          }))
        );
      }
    });
    const unsub3 = on<ChatMessage & { room?: string }>("support:message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, [on, selectedTicketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setMessages([]);
    emit("support:load-history", { ticketId });
  };

  const takeTicket = (ticketId: string) => {
    emit("support:take", { ticketId });
    selectTicket(ticketId);
  };

  const sendMessage = () => {
    if (!input.trim() || !selectedTicketId) return;
    emit("support:admin-message", { ticketId: selectedTicketId, text: input.trim() });
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "admin", text: input.trim(), timestamp: new Date().toISOString() },
    ]);
    setInput("");
  };

  const closeTicket = () => {
    if (!selectedTicketId) return;
    emit("support:end", { ticketId: selectedTicketId });
    setSelectedTicketId(null);
    setMessages([]);
  };

  const reopenTicket = (ticketId: string) => {
    emit("support:reopen", { ticketId });
  };
const deleteTicket = (ticketId: string) => {
  emit("support:delete", { ticketId });

  if (selectedTicketId === ticketId) {
    setSelectedTicketId(null);
    setMessages([]);
  }
};
  const filteredTickets = tickets.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "waiting": return <Badge variant="warning" size="sm">Bekliyor</Badge>;
      case "active": return <Badge variant="success" size="sm">Aktif</Badge>;
      case "closed": return <Badge variant="accent" size="sm">Kapalı</Badge>;
      default: return <Badge size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 max-w-[1200px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Destek Talepleri</h1>
          <p className="mt-0.5 text-sm text-text-muted">Database tabanlı persistent support sistemi</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "success" : "danger"} size="sm">
            {connected ? "Bağlı" : "Bağlantı Yok"}
          </Badge>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "waiting", "active", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-surface-raised text-text-secondary hover:bg-surface-hover"
            }`}
          >
            {f === "all" ? "Tümü" : f === "waiting" ? "Bekleyen" : f === "active" ? "Aktif" : "Kapalı"}
            <span className="ml-1.5 text-[11px] opacity-80">
              {tickets.filter((t) => f === "all" || t.status === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Ticket list */}
        <div className="lg:col-span-2 space-y-2 max-h-[640px] overflow-y-auto pr-1">
          {filteredTickets.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">Ticket bulunmuyor</div>
          ) : (
            filteredTickets.map((t) => (
              <div
                key={t.ticketId}
                onClick={() => selectTicket(t.ticketId)}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  selectedTicketId === t.ticketId
                    ? "border-accent bg-accent/5"
                    : "border-border hover:bg-surface-raised/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-mono text-text-muted">{t.ticketId}</span>
                  {statusBadge(t.status)}
                </div>
                <p className="text-[13px] font-medium text-foreground truncate">
                  {t.lastMessagePreview || t.subject}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                  <span>{t.visitorIp}</span>
                  <span>·</span>
                  <span>{t.visitorBrowser}</span>
                  <span>·</span>
                  <span>{t.messageCount} mesaj</span>
                </div>
                {t.unreadByAdmin && (
                  <Badge variant="danger" size="sm" className="mt-1.5">Yeni mesaj</Badge>
                )}
                {t.status === "waiting" && (
                  <Button size="sm" variant="primary" className="mt-2" onClick={(e) => { e.stopPropagation(); takeTicket(t.ticketId); }}>
                    Al
                  </Button>
                )}
                {t.status === "closed" && (
  <div className="mt-2 flex gap-2">
    <Button
      size="sm"
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        reopenTicket(t.ticketId);
      }}
    >
      <RotateCcw size={12} className="mr-1" />
      Yeniden aç
    </Button>

    <Button
      size="sm"
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        deleteTicket(t.ticketId);
      }}
    >
      Sil
    </Button>
  </div>
)}
              </div>
            ))
          )}
        </div>

        {/* Chat panel */}
        <Card className="lg:col-span-3 flex flex-col" padding="none">
          {selectedTicket ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <HeadsetIcon size={14} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{selectedTicket.ticketId}</p>
                    <p className="text-[10px] text-text-muted">{selectedTicket.visitorIp} · {selectedTicket.visitorBrowser} · {selectedTicket.visitorDevice}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTicket.status !== "closed" && (
                    <Button variant="ghost" size="sm" onClick={closeTicket}>
                      <X size={14} className="mr-1" /> Kapat
                    </Button>
                  )}
                  {selectedTicket.status === "closed" && (
                    <Button size="sm" variant="primary" onClick={() => reopenTicket(selectedTicket.ticketId)}>
                      <RotateCcw size={14} className="mr-1" /> Yeniden aç
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-text-muted py-8">Mesaj geçmişi yükleniyor...</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-[13px] ${msg.sender === "admin" ? "bg-accent text-white" : "bg-surface-raised text-foreground border border-border"}`}>
                      {msg.text}
                      <span className="block mt-0.5 text-[10px] opacity-60">
                        {new Date(msg.timestamp).toLocaleTimeString("tr-TR")}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {selectedTicket.status !== "closed" && (
                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Mesaj yaz..."
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                    />
                    <Button size="sm" variant="primary" onClick={sendMessage}>
                      <Send size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <MessageSquare size={32} className="text-text-muted mb-3" />
              <p className="text-sm text-text-muted">Bir ticket seçerek geçmiş mesajları görün ve yanıtlayın</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

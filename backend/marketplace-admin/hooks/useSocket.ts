"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

interface UseSocketOptions {
  type?: "admin" | "support";
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      query: { type: options.type || "admin" },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setConnecting(false);
      options.onConnect?.();
    });

    socket.on("disconnect", () => {
      setConnected(false);
      options.onDisconnect?.();
    });

    socket.on("connect_error", () => {
      setConnecting(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [options.type]);

  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return { socket: socketRef.current, connected, connecting, emit, on };
}

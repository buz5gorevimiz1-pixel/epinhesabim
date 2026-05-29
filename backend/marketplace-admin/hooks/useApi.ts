"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { ApiResponse } from "@/types";

export function useApi<T>(endpoint: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result: ApiResponse<T> = await api.get(endpoint);
    if (result.success && result.data) {
      setData(result.data);
    } else {
      setError(result.error || "Bir hata oluştu");
    }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, deps);

  return { data, loading, error, refetch: fetchData };
}

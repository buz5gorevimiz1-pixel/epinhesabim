import { API_BASE_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./constants";
import { ApiResponse } from "@/types";

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Refresh failed");
    }

    const result = await response.json();
    if (result.success && result.data?.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, result.data.accessToken);
      if (result.data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, result.data.refreshToken);
      }
      return result.data.accessToken;
    }
    throw new Error("Invalid refresh response");
  } catch {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = typeof window !== "undefined"
      ? localStorage.getItem(ACCESS_TOKEN_KEY)
      : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      // Handle 401 with auto refresh
      if (response.status === 401 && retry && token) {
        if (!isRefreshing) {
          isRefreshing = true;
          const newToken = await refreshAccessToken();
          isRefreshing = false;

          if (newToken) {
            onRefreshed(newToken);
            // Retry original request with new token
            return this.request(endpoint, options, false);
          }
        } else {
          // Wait for refresh to complete
          return new Promise((resolve) => {
            addRefreshSubscriber(() => {
              resolve(this.request(endpoint, options, false));
            });
          });
        }
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        return {
          success: false,
          error: `Server returned HTML (status ${response.status}). Backend may be unreachable or returned an error page.`,
        };
      }
      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE_URL);

export const authApi = {
  login: (identifier: string, password: string) =>
    api.post<{
      user: import("@/types").User;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>("/auth/login", { identifier, password }),

  logout: () => api.post("/auth/logout", {}),

  me: () => api.get<import("@/types").User>("/auth/me"),
};

export const dashboardApi = {
  stats: () => api.get<import("@/types").DashboardStats>("/dashboard/stats"),
  activities: () => api.get<{ activities: import("@/types").Activity[] }>("/dashboard/activities"),
  visitors: () => api.get<{ visitors: any[] }>("/dashboard/visitors"),
  supportQueue: () => api.get<{ queue: any[]; active: any[] }>("/dashboard/support-queue"),
  recentOrders: (limit?: number) => api.get<{ orders: any[] }>("/dashboard/orders/recent" + (limit ? `?limit=${limit}` : "")),
  systemStatus: () => api.get<{
    maintenanceMode: boolean;
    liveSupportEnabled: boolean;
    popupEnabled: boolean;
    widgetEnabled: boolean;
    onlineAdmins: number;
    adminSockets: any[];
  }>("/dashboard/system-status"),
  fraudAlerts: () => api.get<{ alerts: any[] }>("/dashboard/fraud-alerts"),
};

export const sliderApi = {
  list: () => api.get<{ sliders: any[] }>("/sliders"),
  create: (body: any) => api.post<{ slider: any }>("/sliders", body),
  update: (id: string, body: any) => api.patch<{ slider: any }>(`/sliders/${id}`, body),
  delete: (id: string) => api.delete(`/sliders/${id}`),
  reorder: (orders: { id: string; order: number }[]) => api.post<{ sliders: any[] }>("/sliders/reorder", { orders }),
};

export const usersApi = {
  list: (params?: Record<string, string>) => api.get<{ users: import("@/types").User[]; pagination: any }>("/users" + (params ? "?" + new URLSearchParams(params).toString() : "")),
  detail: (id: string) => api.get<{ user: import("@/types").User; auditLogs: any[]; transactions: any[] }>(`/users/${id}`),
  updateStatus: (id: string, status: string, reason?: string) => api.patch(`/users/${id}/status`, { status, reason }),
  updateRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
  updateBalance: (id: string, amount: number, type: "add" | "deduct", description?: string) =>
    api.patch(`/users/${id}/balance`, { amount, type, description }),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

export const listingsApi = {
  list: (params?: Record<string, string>) => api.get<{ listings: any[]; pagination: any }>("/listings" + (params ? "?" + new URLSearchParams(params).toString() : "")),
  stats: () => api.get<{ pending: number; approved: number; rejected: number; active: number; hidden: number; removed: number; featured: number }>("/listings/stats"),
  approve: (id: string) => api.patch(`/listings/${id}/approve`, {}),
  reject: (id: string, reason?: string) => api.patch(`/listings/${id}/reject`, { reason }),
  feature: (id: string, featured: boolean) => api.patch(`/listings/${id}/feature`, { featured }),
  activate: (id: string) => api.patch(`/listings/${id}/activate`, {}),
  hide: (id: string) => api.patch(`/listings/${id}/hide`, {}),
  remove: (id: string, reason?: string) => api.patch(`/listings/${id}/remove`, { reason }),
  delete: (id: string) => api.delete(`/listings/${id}`),
};

export const financeApi = {
  transactions: (params?: Record<string, string>) => api.get<{ transactions: any[]; pagination: any }>("/finance/transactions" + (params ? "?" + new URLSearchParams(params).toString() : "")),
  stats: () => api.get<{ totalVolume: number; todayVolume: number; flaggedCount: number; pendingWithdrawals: number }>("/finance/stats"),
  withdrawals: (params?: Record<string, string>) => api.get<{ withdrawals: any[]; pagination: any }>("/finance/withdrawals" + (params ? "?" + new URLSearchParams(params).toString() : "")),
  approveWithdrawal: (id: string) => api.patch(`/finance/withdrawals/${id}/approve`, {}),
  rejectWithdrawal: (id: string, reason?: string) => api.patch(`/finance/withdrawals/${id}/reject`, { reason }),
};

export const auditApi = {
  list: (params?: Record<string, string>) => api.get<{ logs: any[]; pagination: any }>("/audit-logs" + (params ? "?" + new URLSearchParams(params).toString() : "")),
  actions: () => api.get<{ actions: string[] }>("/audit-logs/actions"),
};

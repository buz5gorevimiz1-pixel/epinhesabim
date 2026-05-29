export type UserRole = "user" | "admin" | "super_admin" | "support_admin" | "moderator" | "finance_admin" | "security_admin";

export interface User {
  id: string;
  _id?: string;
  email: string;
  username?: string;
  fullName?: string;
  name: string;
  role: UserRole;
  avatar?: string;
  status?: "active" | "pending" | "banned";
  balance?: number;
  phone?: string;
  verificationStatus?: "none" | "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DashboardStats {
  totalUsers: number;
  usersToday: number;
  totalOrders: number;
  ordersToday: number;
  totalRevenue: number;
  todayRevenue: number;
  activeListings: number;
  pendingListings: number;
  flaggedCount: number;
  pendingWithdrawals: number;
  onlineVisitors: number;
  supportQueue: number;
  activeChats: number;
  adminOnline: number;
  changes: {
    users: number;
    orders: number;
  };
}

export interface Activity {
  id: string;
  type: "order" | "user" | "listing" | "payment";
  title: string;
  description: string;
  createdAt: string;
  user?: User;
}

export interface SidebarItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export type ThemeColor = "cyan" | "magenta" | "lime" | "amber";

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

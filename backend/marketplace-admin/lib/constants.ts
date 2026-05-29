export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v2";

export const ACCESS_TOKEN_KEY = "admin_access_token";
export const REFRESH_TOKEN_KEY = "admin_refresh_token";
export const TOKEN_EXPIRY_KEY = "admin_token_expiry";

export const SIDEBAR_ITEMS = [
  { label: "Operasyon Merkezi", href: "/", icon: "LayoutDashboard" },
  { label: "Kullanıcılar", href: "/users", icon: "Users" },
  { label: "İlan Moderasyonu", href: "/listings", icon: "Package" },
  { label: "Finans Yönetimi", href: "/finance", icon: "CreditCard" },
  { label: "Audit & Log", href: "/audit", icon: "ShieldCheck" },
  { label: "Homepage Builder", href: "/sliders", icon: "LayoutTemplate" },
] as const;

export const THEME_COLORS = {
  cyan: { primary: "#06b6d4", glow: "rgba(6,182,212,0.4)" },
  magenta: { primary: "#d946ef", glow: "rgba(217,70,239,0.4)" },
  lime: { primary: "#84cc16", glow: "rgba(132,204,22,0.4)" },
  amber: { primary: "#f59e0b", glow: "rgba(245,158,11,0.4)" },
} as const;

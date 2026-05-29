"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { NeonText } from "@/components/ui/NeonText";
import { ShieldCheck, User, Lock } from "lucide-react";

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(identifier, password);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20 shadow-[0_0_24px_rgba(6,182,212,0.2)]">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            <NeonText>Marketplace Admin</NeonText>
          </h1>
          <p className="text-sm text-text-muted">Yönetim paneline giriş yapın</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-2xl">
          <Input
            label="Kullanıcı Adı / E-posta"
            type="text"
            placeholder="admin"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            icon={<User size={16} />}
            required
          />
          <Input
            label="Şifre"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            required
          />
          <Button type="submit" size="lg" className="w-full mt-2" isLoading={loading}>
  Giriş Yap
</Button>
        </form>

        {/* Demo credentials */}
        

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted">
          Next.js + Tailwind Cyberpunk Admin Dashboard
        </p>
      </div>
    </div>
  );
}

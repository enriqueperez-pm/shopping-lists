"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/inicio";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getBrowserSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen-safe flex flex-col bg-flujo-deep">
      <div className="px-6 pt-12 pb-8 text-center text-white">
        <p className="text-editorial text-lg text-white/90">klagi</p>
        <h1 className="text-title text-white mt-2">Administración</h1>
        <p className="text-caption text-white/75 mt-1 font-body">Inicia sesión para continuar</p>
      </div>

      <div className="flex-1 px-4 pb-8">
        <div className="w-full max-w-sm mx-auto surface-soft p-6 space-y-5 rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1">
              <span className="modal-label">Correo</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="modal-input"
              />
            </label>
            <label className="block space-y-1">
              <span className="modal-label">Contraseña</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="modal-input"
              />
            </label>
            {error && <p className="text-sm text-danger font-body">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

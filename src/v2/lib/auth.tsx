import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { backend } from "./backend";

interface V2Auth {
  session: Session | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<V2Auth | undefined>(undefined);

export function V2AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = backend.auth.onAuthStateChange((_event, s) => { setSession(s); setLoading(false); });
    backend.auth.getSession().then(({ data: { session: s } }) => { setSession(s); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) { setRole(null); return; }
    let cancelled = false;
    backend.from("user_roles").select("role").eq("user_id", userId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setRole((data as { role?: string } | null)?.role ?? null); });
    return () => { cancelled = true; };
  }, [userId]);

  const signIn = async (email: string, password: string) => {
    const { error } = await backend.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  };
  const signOut = async () => { await backend.auth.signOut(); };

  return <Ctx.Provider value={{ session, role, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useV2Auth(): V2Auth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useV2Auth must be used inside V2AuthProvider");
  return ctx;
}

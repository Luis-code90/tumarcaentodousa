import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

// Tracks the Supabase session plus the profiles.role for the current user.
// role is fetched separately (not from the JWT) because RLS already lets a
// logged-in user read their own profiles row ("profiles: lectura propia o
// admin" in rls.sql) — no need for custom claims or an extra service.
//
// This context wraps the whole app (cheap: it only holds state, it doesn't
// force a login anywhere). The actual admin gate lives in RequireAdmin.jsx.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRole(userId) {
      const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
      if (cancelled) return;
      // A missing profiles row (error) is treated as "no admin rights" rather
      // than thrown — handle_new_user() should always create one, but this
      // keeps the panel from breaking if that ever isn't true.
      setRole(error ? null : data.role);
    }

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (cancelled) return;
      setSession(initialSession);
      if (initialSession?.user) await loadRole(initialSession.user.id);
      if (!cancelled) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      if (newSession?.user) {
        await loadRole(newSession.user.id);
      } else {
        setRole(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    role,
    isAdmin: role === "admin",
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

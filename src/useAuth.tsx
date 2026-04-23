import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  cloudEnabled: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  const cloudEnabled = isSupabaseConfigured();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    void (async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.warn("[visual-dairy] Auth getSession error:", error.message);
          await supabase.auth.signOut({ scope: "local" });
          setUser(null);
          return;
        }
        setUser(session?.user ?? null);
      } catch (e) {
        console.warn(
          "[visual-dairy] Could not reach Supabase Auth (wrong VITE_SUPABASE_URL, offline, or DNS). Clearing stored session so the app can still load in public read-only mode.",
          e,
        );
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Cloud is not configured." };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Cloud is not configured." };
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn(
        "[visual-dairy] Remote sign-out failed (network). Clearing local session.",
        e,
      );
      await supabase.auth.signOut({ scope: "local" });
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      cloudEnabled,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading, cloudEnabled, signIn, signUp, signOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

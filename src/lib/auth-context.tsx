import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: string[];
  loading: boolean;
  isRider: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRoles = (uid: string) => {
    // Defer so we don't block the auth state callback
    setTimeout(async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (!error && data) {
        setRoles(data.map((r: { role: string }) => r.role));
      } else {
        setRoles([]);
      }
      setLoading(false);
    }, 0);
  };

  useEffect(() => {
    // 1) Subscribe FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        fetchRoles(newSession.user.id);
      } else {
        setRoles([]);
        setLoading(false);
      }
    });

    // 2) Then read existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchRoles(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Safety: never leave loading=true forever
    safetyTimer.current = setTimeout(() => setLoading(false), 5000);

    return () => {
      subscription.unsubscribe();
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        roles,
        loading,
        isRider: roles.includes("rider"),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { getAuth, setAuth, clearAuth, type AuthState, type AuthUser } from "@/lib/auth";

interface AuthContextValue {
  auth: AuthState | null;
  login: (token: string, role: "student" | "admin", user?: AuthUser) => void;
  logout: () => void;
  isStudent: boolean;
  isAdmin: boolean;
  studentId: number | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState | null>(() => getAuth());

  const login = useCallback((token: string, role: "student" | "admin", user?: AuthUser) => {
    const state: AuthState = { token, role, user };
    setAuth(state);
    setAuthState(state);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuthState(null);
  }, []);

  const isStudent = auth?.role === "student";
  const isAdmin = auth?.role === "admin";
  const studentId = isStudent && auth?.user?.id ? auth.user.id : null;

  return (
    <AuthContext.Provider value={{ auth, login, logout, isStudent, isAdmin, studentId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

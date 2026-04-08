export interface AuthUser {
  id: number;
  name?: string;
  email: string;
  grade?: string;
  status?: string;
  subscriptionTier?: string;
}

export interface AuthState {
  token: string;
  role: "student" | "admin";
  user?: AuthUser;
}

const STORAGE_KEY = "ada21tech_auth";

export function getAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(state: AuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

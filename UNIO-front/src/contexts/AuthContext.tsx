import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import api, { getApiErrorMessage, TOKEN_KEY } from "../services/api";

export type UserRole = "startup" | "investidor" | "admin";

export interface UserProfile {
  id?: string;
  email: string;
  role: UserRole;
  // false = a conta existe, mas o perfil (startup/investidor) ainda não foi
  // cadastrado (o GET /api/profile/me responde 404 nesse caso)
  perfilCompleto?: boolean;
  [key: string]: unknown;
}

interface AuthResponse {
  token: string;
  email: string;
  role: string;
}

interface RegisterData {
  email: string;
  password: string;
  role: "STARTUP" | "INVESTOR";
  documento: string;
  acceptedTerms: boolean;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<UserProfile>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => void;
  // Busca o perfil de novo (ex.: logo depois de cadastrar o perfil)
  refreshProfile: () => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRole(role: string): UserRole {
  const normalized = role.toLowerCase();
  if (normalized === "investor" || normalized === "investidor") return "investidor";
  if (normalized === "admin") return "admin";
  return "startup";
}

function toProfile(data: Record<string, unknown>): UserProfile {
  return {
    ...data,
    email: String(data.email ?? ""),
    role: normalizeRole(String(data.role ?? "")),
  };
}

// Lê e-mail, id e papel das claims do JWT (sub, userId, role). Não valida a
// assinatura — isso é papel do back; aqui só serve pra manter a sessão de
// quem ainda não tem perfil cadastrado.
function profileFromToken(token: string): UserProfile | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    if (typeof claims.sub !== "string" || typeof claims.role !== "string") return null;
    return {
      id: claims.userId != null ? String(claims.userId) : undefined,
      email: claims.sub,
      role: normalizeRole(claims.role),
      perfilCompleto: false,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [isLoading, setIsLoading] = useState(true);
  const skipNextValidation = useRef(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get<Record<string, unknown>>("/api/profile/me");
      const profile = { ...toProfile(response.data), perfilCompleto: true };
      setUser(profile);
      return profile;
    } catch (error) {
      // 404 = conta criada, mas sem perfil de startup/investidor ainda. Antes
      // isso derrubava a sessão (e o login falhava), deixando a pessoa sem
      // como chegar na tela de cadastro do perfil.
      const semPerfil = axios.isAxiosError(error) && error.response?.status === 404;
      const tokenAtual = localStorage.getItem(TOKEN_KEY);
      const profile = semPerfil && tokenAtual ? profileFromToken(tokenAtual) : null;
      if (!profile) throw error;
      setUser(profile);
      return profile;
    }
  }, []);

  useEffect(() => {
    if (skipNextValidation.current) {
      skipNextValidation.current = false;
      setIsLoading(false);
      return;
    }
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchProfile()
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));
  }, [clearSession, fetchProfile, token]);

  const login = useCallback(
    async (email: string, senha: string) => {
      const response = await api.post<AuthResponse>("/api/auth/login", {
        email,
        password: senha,
      });
      localStorage.setItem(TOKEN_KEY, response.data.token);
      setToken(response.data.token);
      return fetchProfile();
    },
    [fetchProfile],
  );

  const register = useCallback(async (data: RegisterData) => {
    const response = await api.post<AuthResponse>("/api/auth/register", data);
    skipNextValidation.current = true;
    localStorage.setItem(TOKEN_KEY, response.data.token);
    setToken(response.data.token);
    setUser({
      email: response.data.email,
      role: normalizeRole(response.data.role),
      perfilCompleto: false,
    });
    return response.data;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    window.location.assign("/login");
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      register,
      logout,
      refreshProfile: fetchProfile,
    }),
    [fetchProfile, isLoading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  return context;
}

export { getApiErrorMessage };

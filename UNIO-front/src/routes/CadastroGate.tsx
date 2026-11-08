import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Fica em volta da área logada: quem tem conta mas ainda não tem perfil
// (GET /api/profile/me respondeu 404) é mandado pro onboarding do seu perfil,
// que é o único caminho de criação de perfil (docs/adr/ADR-001). Deve ficar
// dentro de um ProtectedRoute.
export default function CadastroGate({ rotaOnboarding }: { rotaOnboarding: string }) {
  const { user } = useAuth();
  if (user?.perfilCompleto === false) {
    return <Navigate to={rotaOnboarding} replace />;
  }
  return <Outlet />;
}

import { useNavigate, useSearchParams } from "react-router-dom";
import AuthCard from "../components/auth/AuthCard";

// Depois do login, o destino depende do tipo de conta: admin cai no painel
// de administração, e startup/investidor caem na respectiva página inicial.
function rotaPosLogin(role: string) {
  if (role.toLowerCase() === "admin") return "/admin";
  if (role.toLowerCase() === "investidor" || role.toLowerCase() === "investor") return "/home-investidor";
  return "/home-startup";
}

// Depois do registro a conta ainda não tem perfil: o onboarding do tipo de
// conta é quem cria o perfil (docs/adr/ADR-001).
function rotaPosRegistro(role: string) {
  return role.toLowerCase().includes("invest") ? "/onboarding/investidor" : "/onboarding/startup";
}

export default function Login() {
  const navigate = useNavigate();
  // /login?modo=cadastro abre direto no formulário de criar conta (botão
  // "Comece Agora" da landing e o endereço antigo /cadastro)
  const [params] = useSearchParams();
  const modoInicial = params.get("modo") === "cadastro" ? "signup" : "login";
  // Vindo do interceptor do api.ts: o token venceu ou o back recusou (401)
  const sessaoExpirada = params.get("sessao") === "expirada";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-deepgreen to-sage px-4 py-10">
      {sessaoExpirada && (
        <p role="status" className="w-full max-w-md rounded-2xl bg-white/95 px-4 py-3 text-center text-sm font-semibold text-deepgreen">
          Sua sessão expirou. Entre novamente para continuar.
        </p>
      )}
      <AuthCard
        modoInicial={modoInicial}
        onLoginSuccess={(role) => navigate(rotaPosLogin(role))}
        onSignupSuccess={(role) => navigate(rotaPosRegistro(role), { replace: true })}
      />
    </div>
  );
}

import { useAuth } from "../contexts/AuthContext";
import { perfilDoPapel } from "../components/layout/navegacao";
import CadastroGate from "./CadastroGate";
import OnboardingGate from "./OnboardingGate";

// CadastroGate/OnboardingGate do perfil logado, para o grupo de rotas que
// investidor e startup compartilham. Os dois levam ao onboarding do perfil:
// o CadastroGate quando a conta ainda não tem perfil (obrigatório), o
// OnboardingGate quando o perfil existe mas o onboarding está pendente. O
// <Outlet /> dos gates renderiza as rotas filhas desta.
export default function GatePorPerfil({ etapa }: { etapa: "cadastro" | "onboarding" }) {
  const { user } = useAuth();
  const perfil = perfilDoPapel(user?.role);
  if (etapa === "cadastro") {
    return <CadastroGate rotaOnboarding={`/onboarding/${perfil}`} />;
  }
  return <OnboardingGate perfil={perfil} />;
}

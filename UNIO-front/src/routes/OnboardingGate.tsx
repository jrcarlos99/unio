import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { readStatus } from "../services/onboardingAnswersStore";
import {
  chaveUsuario,
  gravarStatusLocal,
  lerStatusLocal,
  statusEfetivo,
  statusOnboardingDoBack,
} from "../services/onboardingService";
import type { PerfilOnboarding, StatusOnboarding } from "../types/onboarding";

// Status deste navegador; sem ele, e com perfil criado, pergunta ao back
// (ADR-007). Assim, quem concluiu ou pulou o wizard em outro navegador não
// volta para ele. Concluído ou pulado no back também fica gravado aqui, para
// a próxima visita não consultar de novo. O status no localStorage é estado
// local, não é mock: só evita perguntar ao back a cada navegação (ADR-011).
async function descobrirStatus(
  userKey: string,
  perfil: PerfilOnboarding,
  temPerfil: boolean,
): Promise<StatusOnboarding> {
  const local = await lerStatusLocal(userKey);
  if (local !== null || !temPerfil) return local ?? "pendente";
  try {
    const doBack = statusOnboardingDoBack(await readStatus());
    if (doBack !== "pendente") await gravarStatusLocal(userKey, perfil, doBack);
    return doBack;
  } catch {
    // Sem resposta do back: como antes, o wizard (que retoma de onde parou)
    return "pendente";
  }
}

// Fica em volta da home do perfil: se o usuário ainda não concluiu nem pulou
// o onboarding, manda pra rota de onboarding. Assim o login (que navega pra
// home) passa por aqui sem precisar mudar aquela tela. Conta sem perfil conta
// sempre como pendente (ver statusEfetivo). Deve ficar dentro de um
// ProtectedRoute.
export default function OnboardingGate({ perfil }: { perfil: PerfilOnboarding }) {
  const { user } = useAuth();
  const userKey = user ? chaveUsuario(user) : "";
  const temPerfil = user?.perfilCompleto !== false;
  const chave = `${userKey}:${temPerfil}`;
  const [status, setStatus] = useState<{ chave: string; valor: StatusOnboarding } | null>(null);

  useEffect(() => {
    let ativo = true;
    descobrirStatus(userKey, perfil, temPerfil).then((valor) => {
      if (ativo) setStatus({ chave, valor });
    });
    return () => {
      ativo = false;
    };
  }, [chave, perfil, temPerfil, userKey]);

  // Carregamento curto (inclusive durante a consulta ao back): nada do wizard
  // aparece antes de saber o status
  if (!status || status.chave !== chave) {
    return (
      <div className="p-8 text-deepgreen" role="status" aria-live="polite">
        Carregando...
      </div>
    );
  }
  if (statusEfetivo(status.valor, temPerfil) === "pendente") {
    return <Navigate to={`/onboarding/${perfil}`} replace />;
  }
  return <Outlet />;
}

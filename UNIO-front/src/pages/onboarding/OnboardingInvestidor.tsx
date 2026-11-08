import { Check } from "lucide-react";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";
import { contagem } from "../../components/onboarding/selecao";
import { useOnboarding } from "../../hooks/useOnboarding";
import PassoEstagios from "./investidor/PassoEstagios";
import PassoInteresses from "./investidor/PassoInteresses";
import PassoRegiao from "./investidor/PassoRegiao";
import PassoTicket from "./investidor/PassoTicket";
import { MIN_SEGMENTOS_INVESTIDOR } from "./investidor/config";

// Onboarding do investidor/mentor (4 passos), exibido no primeiro acesso.
export default function OnboardingInvestidor() {
  const onboarding = useOnboarding("investidor");
  const { respostas, atualizar, passo, passoValido } = onboarding;

  if (onboarding.carregando) {
    return <div className="p-8 text-deepgreen">Carregando...</div>;
  }

  const props = { respostas, atualizar };
  const passos = {
    1: {
      titulo: "O que te interessa investir?",
      subtitulo: `Escolha pelo menos ${MIN_SEGMENTOS_INVESTIDOR} segmentos. Vamos usar isso para sugerir as startups certas para você.`,
      aviso: "Você poderá refinar ou expandir suas preferências setoriais a qualquer momento nas configurações do seu perfil de tese de investimento.",
      resumo:
        contagem(respostas.segmentosInteresse.length, "selecionado", "selecionados") +
        (passoValido ? "" : ` · mínimo ${MIN_SEGMENTOS_INVESTIDOR}`),
      conteudo: <PassoInteresses {...props} />,
    },
    2: {
      titulo: "Em que estágio você prefere investir?",
      subtitulo: "Selecione todos os estágios que fazem sentido para você. Isso refina as startups que vamos recomendar.",
      aviso: "Você poderá ajustar seus estágios preferidos a qualquer momento nas configurações do seu perfil.",
      resumo: passoValido
        ? contagem(respostas.estagiosInteresse.length, "estágio selecionado", "estágios selecionados")
        : "Selecione pelo menos 1 estágio",
      conteudo: <PassoEstagios {...props} />,
    },
    3: {
      titulo: "Qual o seu ticket e quanto tempo você pode dedicar?",
      subtitulo: "Assim mostramos startups com a necessidade de capital e de mentoria compatível com a sua realidade.",
      aviso: "Seu ticket não é exibido publicamente para as startups, apenas usado para calcular a compatibilidade.",
      resumo: passoValido ? "Preferências definidas" : "Defina ticket e disponibilidade",
      conteudo: <PassoTicket {...props} />,
    },
    4: {
      titulo: "Onde estão as startups que você quer conhecer?",
      subtitulo: "Último passo! Escolha as regiões de interesse e vamos montar suas primeiras recomendações.",
      aviso: "Quase lá! Suas recomendações serão geradas assim que você concluir.",
      resumo:
        respostas.regioesInteresse.length > 0
          ? contagem(respostas.regioesInteresse.length, "região selecionada", "regiões selecionadas")
          : "Selecione pelo menos 1 região",
      conteudo: <PassoRegiao {...props} onEditar={onboarding.goTo} />,
    },
  }[passo];

  if (!passos) return null;

  const ultimoPasso = passo === onboarding.totalPassos;
  // Sem perfil, o último passo cria o perfil (ADR-001)
  const rotuloFinal = onboarding.temPerfil ? "Concluir e ver recomendações" : "Concluir e criar meu perfil";

  return (
    <OnboardingLayout
      perfil="investidor"
      etapas={onboarding.etapas}
      passo={passo}
      titulo={passos.titulo}
      subtitulo={passos.subtitulo}
      aviso={passos.aviso}
      statusFinal="Etapa final de validação"
      onSkip={onboarding.skip}
      podePular={onboarding.temPerfil}
      erro={onboarding.erroEnvio?.mensagem}
      onTentarNovamente={
        onboarding.erroEnvio && onboarding.erroEnvio.tipo !== "validacao" ? onboarding.finish : undefined
      }
      onGoTo={onboarding.goTo}
      resumo={passos.resumo}
      resumoAtivo={ultimoPasso ? respostas.regioesInteresse.length > 0 : passoValido}
      onBack={onboarding.back}
      onPrimary={ultimoPasso ? onboarding.finish : onboarding.next}
      primaryLabel={ultimoPasso ? rotuloFinal : "Continuar"}
      primaryIcon={ultimoPasso ? Check : undefined}
      primaryDisabled={!passoValido}
      ocupado={onboarding.ocupado}
    >
      {passos.conteudo}
    </OnboardingLayout>
  );
}

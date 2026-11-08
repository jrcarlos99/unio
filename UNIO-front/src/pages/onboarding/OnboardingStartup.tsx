import { Check } from "lucide-react";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";
import { contagem } from "../../components/onboarding/selecao";
import { useOnboarding } from "../../hooks/useOnboarding";
import PassoBusca from "./startup/PassoBusca";
import PassoLocalizacao from "./startup/PassoLocalizacao";
import PassoModelo from "./startup/PassoModelo";
import PassoSegmento from "./startup/PassoSegmento";

export default function OnboardingStartup() {
  const onboarding = useOnboarding("startup");
  const { respostas, atualizar, passo, passoValido } = onboarding;

  if (onboarding.carregando) {
    return <div className="p-8 text-deepgreen">Carregando...</div>;
  }

  const props = { respostas, atualizar };
  const passos = {
    1: {
      titulo: "Conte um pouco sobre a sua startup",
      subtitulo: "Com nome, segmento e estágio, já conseguimos começar a encontrar investidores e mentores compatíveis.",
      aviso: "Você poderá alterar nome, segmento e estágio a qualquer momento nas configurações da startup.",
      resumo: passoValido ? "Nome, segmento e estágio definidos" : "Informe nome, segmento e estágio",
      conteudo: <PassoSegmento {...props} />,
    },
    2: {
      titulo: "O que a sua startup procura?",
      subtitulo: "Isso ajuda a gente a mostrar os investidores e mentores mais compatíveis.",
      aviso: "Você poderá ajustar suas metas de captação e necessidades de mentoria a qualquer momento nas configurações da startup.",
      resumo: contagem(respostas.necessidades.length, "objetivo selecionado", "objetivos selecionados"),
      conteudo: <PassoBusca {...props} />,
    },
    3: {
      titulo: "Onde vocês estão e o que já conquistaram?",
      subtitulo: "Região e tração ajudam investidores a avaliar o momento da startup.",
      aviso: "Essas informações aparecem no seu perfil público para investidores e mentores.",
      resumo: passoValido ? "Localização e tração definidas" : "Defina localização e equipe",
      conteudo: <PassoLocalizacao {...props} />,
    },
    4: {
      titulo: "Como a sua startup ganha dinheiro?",
      subtitulo: "Último passo! Com o modelo de negócio e o mercado-alvo, o match fica ainda mais preciso.",
      aviso: "Quase lá! Você poderá completar o Canvas do pitch depois, direto no seu perfil.",
      resumo: passoValido ? "Tudo pronto para começar" : "Complete o credenciamento",
      conteudo: <PassoModelo {...props} />,
    },
  }[passo];

  if (!passos) return null;
  const ultimoPasso = passo === onboarding.totalPassos;
  // Sem perfil, o último passo cria o perfil (ADR-001)
  const rotuloFinal = onboarding.temPerfil ? "Concluir e ver investidores" : "Concluir e criar meu perfil";

  return (
    <OnboardingLayout
      perfil="startup"
      etapas={onboarding.etapas}
      passo={passo}
      titulo={passos.titulo}
      subtitulo={passos.subtitulo}
      aviso={passos.aviso}
      statusFinal="Passo final do credenciamento"
      onSkip={onboarding.skip}
      podePular={onboarding.temPerfil}
      erro={onboarding.erroEnvio?.mensagem}
      onTentarNovamente={
        onboarding.erroEnvio && onboarding.erroEnvio.tipo !== "validacao" ? onboarding.finish : undefined
      }
      onGoTo={onboarding.goTo}
      resumo={passos.resumo}
      resumoAtivo={passoValido}
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

import type { ConfigOnboarding } from "../config";
import type { RespostasStartup } from "../../../types/onboarding";
import { TAMANHO_MAX_TEXTO } from "../../../services/perfilFromOnboarding";

export const RESPOSTAS_INICIAIS_STARTUP: RespostasStartup = {
  nome: "",
  segmento: null,
  estagio: null,
  necessidades: [],
  capitalProcurado: null,
  localizacao: "",
  tracao: [],
  tamanhoEquipe: null,
  modeloNegocio: null,
  mercadoAlvo: "",
  pitch: "",
  consentimentoLgpd: false,
};

function validarPassoStartup(passo: number, respostas: RespostasStartup) {
  switch (passo) {
    case 1: {
      // O nome é obrigatório no back (StartupCreateRequest)
      const nome = respostas.nome.trim();
      return (
        nome !== "" &&
        nome.length <= TAMANHO_MAX_TEXTO &&
        respostas.segmento !== null &&
        respostas.estagio !== null
      );
    }
    case 2:
      return (
        respostas.necessidades.length > 0 &&
        (!respostas.necessidades.includes("Investimento") ||
          respostas.capitalProcurado !== null)
      );
    case 3:
      return (
        respostas.localizacao.trim() !== "" &&
        respostas.tamanhoEquipe !== null
      );
    case 4:
      return respostas.modeloNegocio !== null && respostas.mercadoAlvo.trim() !== "" &&
        respostas.consentimentoLgpd;
    default:
      return false;
  }
}

export const CONFIG_STARTUP: ConfigOnboarding<RespostasStartup> = {
  etapas: ["Nome, segmento e estágio", "O que busca", "Localização e tração", "Modelo de negócio"],
  respostasIniciais: RESPOSTAS_INICIAIS_STARTUP,
  validarPasso: validarPassoStartup,
  rotaHome: "/home-startup",
};

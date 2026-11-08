import type {
  AssuntoReuniao,
  ContraparteReuniao,
  DuracaoReuniao,
  FormatoReuniao,
  LadoReuniao,
  LocalReuniao,
} from "../types/reunioes";
import type { PerfilApp } from "../types/recomendacoes";
import { diaDaSemana, inicioDoDia, somarDias, somarMinutos } from "../utils/datas";

// MOCK, DADOS DE EXEMPLO: reuniões fictícias para a tela de Reuniões não
// abrir vazia. O back ainda NÃO tem reuniões com horários sugeridos. Só o
// services/reunioesService.ts lê daqui.
//
// São criadas apenas com quem deu match (unios do usuário), sempre relativas
// a hoje (semana atual do navegador, no fuso de Recife) e marcadas com
// `exemplo: true`: quando a semana muda, o serviço apaga e recria.
//   - 2 reuniões confirmadas: uma online com link e uma presencial com local
//   - 2 solicitações recebidas, com horários a partir de amanhã (a primeira
//     sugestão de uma delas bate com a presencial, para mostrar o conflito)

// Pessoa de contato fictícia de cada startup (o mock da descoberta não tem
// fundadores). Sem entrada aqui, vale "Equipe <startup>".
export const FUNDADORES_EXEMPLO: Record<string, { nome: string; cargo: string }> = {
  biopay: { nome: "Rafael Moura", cargo: "CEO e cofundador" },
  edusync: { nome: "Lívia Barros", cargo: "CEO e cofundadora" },
  "verde-pay": { nome: "Tiago Ferraz", cargo: "CEO e cofundador" },
  healthpulse: { nome: "Clara Menezes", cargo: "CEO" },
  terraverde: { nome: "João Pedro Alves", cargo: "Fundador" },
};

export const LINK_EXEMPLO = "https://meet.google.com/unio-exem-plo";

export const LOCAL_EXEMPLO: LocalReuniao = {
  nome: "Porto Digital, sala de reuniões do Armazém 14",
  endereco: "Cais do Apolo, 222, Bairro do Recife, Recife - PE",
  referencia: "Em frente ao Marco Zero, recepção no térreo",
};

export interface ReuniaoExemplo {
  contraparte: ContraparteReuniao;
  solicitante: LadoReuniao;
  organizador: LadoReuniao;
  assunto: AssuntoReuniao;
  duracaoMin: DuracaoReuniao;
  formato: FormatoReuniao;
  mensagem?: string;
  pauta?: string;
  horariosSugeridos: string[];
  horarioConfirmado?: string;
  link?: string;
  local?: LocalReuniao;
  status: "pendente" | "confirmada";
}

function as(chave: string, hora: number, minuto = 0) {
  return somarMinutos(inicioDoDia(chave), hora * 60 + minuto);
}

export function montarExemplos(contrapartes: ContraparteReuniao[], perfil: PerfilApp, hoje: string): ReuniaoExemplo[] {
  if (contrapartes.length === 0) return [];
  const quem = (indice: number) => contrapartes[indice % contrapartes.length];
  const amanha = somarDias(hoje, 1);
  const depois = somarDias(hoje, 2);
  // Presencial amanhã quando amanhã ainda é desta semana; senão, ontem
  const diaPresencial = diaDaSemana(hoje) < 6 ? amanha : somarDias(hoje, -1);
  const presencial = as(diaPresencial, 10);
  const investidor = perfil === "investidor";

  return [
    {
      contraparte: quem(0),
      solicitante: "outro",
      organizador: "outro",
      assunto: investidor ? "Apresentação de pitch" : "Conversa sobre investimento",
      duracaoMin: 45,
      formato: "online",
      pauta: investidor
        ? "Apresentação do pitch, números de tração dos últimos 6 meses e uso dos recursos da rodada."
        : "Tese de investimento, momento da rodada e próximos passos para due diligence.",
      horariosSugeridos: [as(hoje, 14)],
      horarioConfirmado: as(hoje, 14),
      link: LINK_EXEMPLO,
      status: "confirmada",
    },
    {
      contraparte: quem(1),
      solicitante: "eu",
      organizador: "eu",
      assunto: investidor ? "Conversa sobre investimento" : "Mentoria",
      duracaoMin: 60,
      formato: "presencial",
      pauta: "Café no Porto Digital para conhecer o time e alinhar expectativas.",
      horariosSugeridos: [presencial],
      horarioConfirmado: presencial,
      local: LOCAL_EXEMPLO,
      status: "confirmada",
    },
    {
      contraparte: quem(2),
      solicitante: "outro",
      organizador: "outro",
      assunto: investidor ? "Apresentação de pitch" : "Mentoria",
      duracaoMin: 30,
      formato: "online",
      mensagem: investidor
        ? "Olá! Vimos o match e gostaríamos de apresentar nosso pitch e a tração recente. Fica bom algum destes horários?"
        : "Olá! Gostei da proposta de vocês e posso ajudar com go-to-market. Topa uma conversa rápida?",
      horariosSugeridos: [as(amanha, 10), as(amanha, 15), as(depois, 11)],
      status: "pendente",
    },
    {
      contraparte: quem(3),
      solicitante: "outro",
      organizador: "outro",
      assunto: investidor ? "Mentoria" : "Conversa sobre investimento",
      duracaoMin: 45,
      formato: "presencial",
      mensagem: investidor
        ? "Queremos ouvir sua visão sobre a nossa estratégia de expansão no Nordeste."
        : "Quero entender melhor o modelo de receita e a meta da rodada. Podemos nos encontrar no Porto Digital?",
      horariosSugeridos: [as(amanha, 17), as(depois, 9, 30)],
      local: LOCAL_EXEMPLO,
      status: "pendente",
    },
  ];
}

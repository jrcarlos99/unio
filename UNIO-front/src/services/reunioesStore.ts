import type { NotificacaoReuniao, Reuniao } from "../types/reunioes";

// MOCK, sem back: persistência das reuniões no localStorage, por e-mail do
// usuário (unio_reunioes_<email>). Fica separada do reunioesService para o
// dashboardStartupService ler as reuniões confirmadas sem import circular
// (reunioesService → recomendacoesService → investidoresService →
// dashboardStartupService). Só esses dois serviços importam este arquivo.

// Campos internos do mock, que não fazem parte do contrato com as telas
export interface ReuniaoArmazenada extends Reuniao {
  // Dado de exemplo (some quando a semana muda e é recriado na semana atual)
  exemplo?: boolean;
  // Quando a "outra parte" do mock aceita a solicitação enviada
  respostaMockEm?: string;
}

export interface BancoReunioes {
  versao: 1;
  // Segunda-feira ("AAAA-MM-DD") da semana em que os exemplos foram criados
  semanaExemplos: string | null;
  reunioes: ReuniaoArmazenada[];
  notificacoes: NotificacaoReuniao[];
  // Quantas solicitações o usuário já enviou (o mock aceita as ímpares)
  envios: number;
}

export const chaveReunioes = (userKey: string) => `unio_reunioes_${userKey}`;

function bancoVazio(): BancoReunioes {
  return { versao: 1, semanaExemplos: null, reunioes: [], notificacoes: [], envios: 0 };
}

// localStorage pode lançar erro (modo privado, cota cheia); a tela continua
// funcionando, só não lembra das reuniões ao recarregar.
export function lerBanco(userKey: string): BancoReunioes {
  if (!userKey) return bancoVazio();
  try {
    const bruto = localStorage.getItem(chaveReunioes(userKey));
    if (!bruto) return bancoVazio();
    const banco = JSON.parse(bruto) as Partial<BancoReunioes>;
    if (banco.versao !== 1 || !Array.isArray(banco.reunioes)) return bancoVazio();
    return {
      versao: 1,
      semanaExemplos: banco.semanaExemplos ?? null,
      reunioes: banco.reunioes,
      notificacoes: Array.isArray(banco.notificacoes) ? banco.notificacoes : [],
      envios: typeof banco.envios === "number" ? banco.envios : 0,
    };
  } catch {
    return bancoVazio();
  }
}

export function gravarBanco(userKey: string, banco: BancoReunioes) {
  if (!userKey) return;
  try {
    localStorage.setItem(chaveReunioes(userKey), JSON.stringify(banco));
  } catch {
    // ver comentário em lerBanco()
  }
}

// Ids dos unios com pelo menos uma reunião confirmada (funil da startup)
export function uniosComReuniaoConfirmada(userKey: string): string[] {
  const ids = lerBanco(userKey)
    .reunioes.filter((reuniao) => reuniao.status === "confirmada")
    .map((reuniao) => reuniao.unioId);
  return [...new Set(ids)];
}

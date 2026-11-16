import type { NotaAvaliacao } from "../types/avaliacoes";

// MOCK, sem back: avaliações e visitas guardadas no localStorage, por e-mail
// do usuário (unio_avaliacoes_<email>). Fica separado do avaliacoesService
// para o reunioesService.mock gravar a avaliação de exemplo da "outra parte"
// sem import circular (avaliacoesService → reunioesService → mock).
//
// O comentário escrito pelo usuário fica guardado aqui (como no banco do
// back), mas NENHUMA função de leitura usada pelas telas devolve o texto.

export interface AvaliacaoEnviadaArmazenada {
  reuniaoId: string;
  nota: NotaAvaliacao;
  // Só guardado. Nunca volta para as telas (ADR-006).
  comentario?: string;
  criadaEm: string;
}

export interface AvaliacaoRecebidaArmazenada {
  reuniaoId: string;
  nota: NotaAvaliacao;
  criadaEm: string;
  // EXEMPLO: nota simulada da outra parte do mock (item 1 da tarefa)
  exemplo: true;
}

export interface BancoAvaliacoes {
  versao: 1;
  enviadas: AvaliacaoEnviadaArmazenada[];
  recebidas: AvaliacaoRecebidaArmazenada[];
  // Perfis que o usuário abriu: id do perfil → quantas aberturas. Só um
  // contador local; com a API a contagem é do back (POST /api/profile-views).
  visitasRegistradas: Record<string, number>;
  // Quantas notas de exemplo já foram dadas (alterna 5, 4, 5, 4...)
  notasExemplo: number;
}

export const chaveAvaliacoes = (userKey: string) => `unio_avaliacoes_${userKey}`;

function bancoVazio(): BancoAvaliacoes {
  return { versao: 1, enviadas: [], recebidas: [], visitasRegistradas: {}, notasExemplo: 0 };
}

// localStorage pode lançar erro (modo privado, cota cheia): a tela continua,
// só não lembra das avaliações ao recarregar.
export function lerAvaliacoes(userKey: string): BancoAvaliacoes {
  if (!userKey) return bancoVazio();
  try {
    const bruto = localStorage.getItem(chaveAvaliacoes(userKey));
    if (!bruto) return bancoVazio();
    const banco = JSON.parse(bruto) as Partial<BancoAvaliacoes>;
    if (banco.versao !== 1) return bancoVazio();
    return {
      versao: 1,
      enviadas: Array.isArray(banco.enviadas) ? banco.enviadas : [],
      recebidas: Array.isArray(banco.recebidas) ? banco.recebidas : [],
      visitasRegistradas:
        banco.visitasRegistradas && typeof banco.visitasRegistradas === "object" ? banco.visitasRegistradas : {},
      notasExemplo: typeof banco.notasExemplo === "number" ? banco.notasExemplo : 0,
    };
  } catch {
    return bancoVazio();
  }
}

export function gravarAvaliacoes(userKey: string, banco: BancoAvaliacoes) {
  if (!userKey) return;
  try {
    localStorage.setItem(chaveAvaliacoes(userKey), JSON.stringify(banco));
  } catch {
    // ver comentário em lerAvaliacoes()
  }
}

// EXEMPLO (mock): a outra parte da reunião avalia o usuário com 5 ou 4,
// alternando, para a popularidade ter dados. Uma vez por reunião.
export function registrarAvaliacaoRecebidaExemplo(userKey: string, reuniaoId: string): boolean {
  const banco = lerAvaliacoes(userKey);
  if (banco.recebidas.some((avaliacao) => avaliacao.reuniaoId === reuniaoId)) return false;
  const nota: NotaAvaliacao = banco.notasExemplo % 2 === 0 ? 5 : 4;
  banco.notasExemplo += 1;
  banco.recebidas.push({ reuniaoId, nota, criadaEm: new Date().toISOString(), exemplo: true });
  gravarAvaliacoes(userKey, banco);
  return true;
}

import type { TipoEventoUnio } from "../types/contato";

// MOCK — estado local dos unios, igual para os dois perfis (o investidor usa o
// prefixo "" e a startup "startup_"). O back ainda NÃO tem: data do match,
// desfazer match e eventos de contato/reunião. Só o discoveryService, o
// investidoresService e o dashboardStartupService usam este arquivo.
//
// - data do match:           unio_match_datas_<prefixo><email>  { id: ISO }
// - recíproco já usado:      unio_reciprocos_usados_<prefixo><email>  [id]
//   (depois de "Desfazer match", o "Tenho interesse" não vira match na hora)
// - eventos:                 unio_eventos_<prefixo><email>  [{ id, tipo, em }]

interface EventoUnio {
  id: string;
  tipo: TipoEventoUnio;
  em: string;
}

// localStorage pode lançar erro (modo privado, cota cheia); a tela continua
// funcionando, só não lembra desses dados ao recarregar.
function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // ver comentário em ler()
  }
}

export function criarUnioLocal(prefixo: string) {
  const chaveDatas = (userKey: string) => `unio_match_datas_${prefixo}${userKey}`;
  const chaveUsados = (userKey: string) => `unio_reciprocos_usados_${prefixo}${userKey}`;
  const chaveEventos = (userKey: string) => `unio_eventos_${prefixo}${userKey}`;

  const uniosComEvento = (userKey: string, tipo: TipoEventoUnio): string[] => {
    const eventos = ler<EventoUnio[]>(chaveEventos(userKey), []);
    return [...new Set(eventos.filter((evento) => evento.tipo === tipo).map((evento) => evento.id))];
  };

  return {
    dataDoMatch(userKey: string, id: string): string | null {
      return ler<Record<string, string>>(chaveDatas(userKey), {})[id] ?? null;
    },
    registrarMatch(userKey: string, id: string) {
      gravar(chaveDatas(userKey), { ...ler<Record<string, string>>(chaveDatas(userKey), {}), [id]: new Date().toISOString() });
    },
    // Desfez o match: some a data e o interesse recíproco do mock fica usado
    desfazer(userKey: string, id: string) {
      const datas = { ...ler<Record<string, string>>(chaveDatas(userKey), {}) };
      delete datas[id];
      gravar(chaveDatas(userKey), datas);
      const usados = ler<string[]>(chaveUsados(userKey), []);
      if (!usados.includes(id)) gravar(chaveUsados(userKey), [...usados, id]);
    },
    reciprocoUsado(userKey: string, id: string) {
      return ler<string[]>(chaveUsados(userKey), []).includes(id);
    },
    registrarEvento(userKey: string, id: string, tipo: TipoEventoUnio) {
      const eventos = ler<EventoUnio[]>(chaveEventos(userKey), []);
      gravar(chaveEventos(userKey), [...eventos, { id, tipo, em: new Date().toISOString() }]);
    },
    // Ids dos unios que tiveram pelo menos um evento desse tipo
    uniosComEvento,
    // Quantos unios diferentes tiveram pelo menos um evento desse tipo
    contarUniosComEvento(userKey: string, tipo: TipoEventoUnio) {
      return uniosComEvento(userKey, tipo).length;
    },
  };
}

export const unioLocalInvestidor = criarUnioLocal("");
export const unioLocalStartup = criarUnioLocal("startup_");

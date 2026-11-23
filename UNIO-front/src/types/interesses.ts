// Interesses recebidos (D065 do back, ADR-015): quem demonstrou interesse em
// mim e ainda não teve o interesse retribuído. Vêm de GET
// /api/interests/received; o JSON do back só é lido em
// services/interessesRecebidos.mapping.ts.

export interface InteresseRecebidoBack {
  userId: number;
  name: string;
  role: "STARTUP" | "INVESTOR";
  segmento: string | null;
  estagio: string | null;
  localizacao: string | null;
  scoreFinal: number | null;
  classification: string | null;
  interestedAt: string;
}

export interface PaginaInteressesRecebidosBack {
  total: number;
  limit: number;
  offset: number;
  items: InteresseRecebidoBack[];
}

export interface ContagemInteressesRecebidosBack {
  total: number;
}

// Como chega no sino
export interface InteresseRecebido {
  id: string;
  nome: string;
  tipo: "startup" | "investidor";
  segmento: string | null;
  estagio: string | null;
  localizacao: string | null;
  // Score de 0 a 100 já calculado pelo back (null se o par ainda não tem)
  compatibilidade: number | null;
  // Quando o interesse foi demonstrado (ISO)
  em: string;
}

export interface InteressesRecebidos {
  // Total no back (pode ser maior que a lista, que vem paginada)
  total: number;
  itens: InteresseRecebido[];
}

// Aviso entre o sino e as listas: alguém retribuiu um interesse (pelo sino ou
// por um card) e o estado daquele perfil mudou
export interface InteresseRetribuido {
  id: string;
  status: "enviado" | "match";
}

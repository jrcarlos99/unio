// Contato de uma das partes, mostrado só para quem deu match (unio). A
// plataforma não tem chat: o contato acontece por canais externos (WhatsApp,
// e-mail, telefone). Reuniões ficam em types/reunioes.ts.
export interface Contato {
  // Só dígitos, com DDI (ex.: "5581999990000")
  whatsapp?: string;
  email?: string;
  telefone?: string;
}

// Contato de um unio + quando o match aconteceu (ISO; null se não registrado)
export interface DadosUnio {
  contato: Contato;
  matchEm: string | null;
}

// Eventos locais para as métricas da home da startup. "reuniao" não é mais
// registrado (as reuniões agora vêm do reunioesService), mas os eventos já
// gravados continuam contando no funil.
export type TipoEventoUnio = "contato" | "reuniao";

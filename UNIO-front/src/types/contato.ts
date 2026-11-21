import type { StatusInteresse } from "./discovery";

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

// Resultado de "Desfazer match". O back cancela as reuniões futuras do par e
// diz quantas; null só se a resposta não trouxer o número (a tela então
// cancela pelo reunioesService).
export interface ResultadoDesfazerMatch {
  status: StatusInteresse;
  reunioesCanceladas: number | null;
}

// Eventos locais para as métricas da home da startup. "reuniao" não é mais
// registrado (as reuniões agora vêm do reunioesService), mas os eventos já
// gravados continuam contando no funil.


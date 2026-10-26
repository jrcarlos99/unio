export type DisponibilidadeMentoria = "BAIXA" | "MEDIA" | "ALTA";

export interface InvestorProfileResponse {
  id: number;
  email: string;
  role: "INVESTOR";
  createdAt: string;
  segmentosInteresse: string[];
  estagiosInteresse: string[];
  ticketMinimo: number | null;
  ticketMaximo: number | null;
  regiaoInteresse: string | null;
  perfilRisco: string | null;
  disponibilidade: DisponibilidadeMentoria | null;
  disponibilidadeObservacao: string | null;
}

export interface InvestorProfileUpdateRequest {
  disponibilidade: DisponibilidadeMentoria | null;
  disponibilidadeObservacao: string;
}

export interface InvestorProfileExtras {
  especialidades: string[];
  bio: string;
  linkedin: string;
  rede: string;
}

export interface StoredInvestorProfileExtras {
  version: 1;
  extras: InvestorProfileExtras;
  updatedAt: string;
}

export interface InvestorProfileFormValues extends InvestorProfileExtras {
  mentoria: boolean;
  disponibilidade: DisponibilidadeMentoria | "";
  disponibilidadeObservacao: string;
}

export type InvestorProfileField =
  | "especialidades"
  | "disponibilidade"
  | "disponibilidadeObservacao"
  | "bio"
  | "linkedin"
  | "rede";

export type InvestorProfileErrors = Partial<Record<InvestorProfileField, string>>;

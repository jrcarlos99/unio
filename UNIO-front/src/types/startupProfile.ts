export interface StartupProfileResponse {
  id: number;
  email: string;
  role: "STARTUP";
  createdAt: string;
  nome: string;
  segmento: string;
  estagio: string;
  localizacao: string;
  modeloNegocio: string;
  mercadoAlvo: string;
  // Opcional desde a D029 do back: startup que não busca investimento
  capitalProcurado: number | null;
  pitchCanvas: string | null;
}


export interface StartupProfileUpdateRequest {
  nome: string;
  segmento: string;
  estagio: string;
  localizacao: string;
  modeloNegocio: string;
  mercadoAlvo: string;
  // null limpa o valor salvo
  capitalProcurado?: number | null;
  pitchCanvas: string;
}

export type StartupProfileFormValues = Omit<StartupProfileUpdateRequest, "capitalProcurado"> & {
  capitalProcurado: string;
};

export type StartupProfileField = keyof StartupProfileFormValues;

export type StartupProfileErrors = Partial<Record<StartupProfileField, string>>;

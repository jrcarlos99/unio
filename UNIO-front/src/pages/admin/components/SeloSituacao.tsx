import type { SituacaoConta, SituacaoEnvio } from "../types";

const SELOS: Record<SituacaoConta | SituacaoEnvio, { rotulo: string; classe: string }> = {
  PENDENTE: { rotulo: "Aguardando aprovação", classe: "bg-amber-50 text-amber-900 ring-1 ring-amber-300" },
  APROVADO: { rotulo: "Aprovada", classe: "bg-sage/30 text-deepgreen ring-1 ring-sage" },
  RECUSADO: { rotulo: "Recusada", classe: "bg-red-50 text-red-800 ring-1 ring-red-200" },
  SUSPENSO: { rotulo: "Suspensa", classe: "bg-red-50 text-red-800 ring-1 ring-red-200" },
  EM_REVISAO: { rotulo: "Em revisão", classe: "bg-amber-50 text-amber-900 ring-1 ring-amber-300" },
  PUBLICADO: { rotulo: "Publicado", classe: "bg-deepgreen text-white" },
  REMOVIDO: { rotulo: "Removido", classe: "bg-red-50 text-red-800 ring-1 ring-red-200" },
};

// Situação de uma conta ou de um envio de pitch na moderação (texto, não só cor)
export default function SeloSituacao({ situacao }: { situacao: SituacaoConta | SituacaoEnvio }) {
  const { rotulo, classe } = SELOS[situacao];
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${classe}`}>
      {rotulo}
    </span>
  );
}

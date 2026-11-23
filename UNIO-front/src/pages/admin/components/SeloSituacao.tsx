import SeloStatus, { type TomSelo } from "../../../components/ui/SeloStatus";
import type { SituacaoConta, SituacaoEnvio } from "../types";

// Os mesmos tons do selo do pitch da startup: em revisão igual a "Em
// revisão", publicado igual a "Publicado", removido igual a "Removido"
const SELOS: Record<SituacaoConta | SituacaoEnvio, { rotulo: string; tom: TomSelo }> = {
  PENDENTE: { rotulo: "Aguardando aprovação", tom: "andamento" },
  APROVADO: { rotulo: "Aprovada", tom: "neutro" },
  RECUSADO: { rotulo: "Recusada", tom: "perigo" },
  SUSPENSO: { rotulo: "Suspensa", tom: "perigo" },
  EM_REVISAO: { rotulo: "Em revisão", tom: "andamento" },
  PUBLICADO: { rotulo: "Publicado", tom: "ativo" },
  REMOVIDO: { rotulo: "Removido", tom: "perigo" },
};

// Situação de uma conta ou de um envio de pitch na moderação (texto, não só cor)
export default function SeloSituacao({ situacao }: { situacao: SituacaoConta | SituacaoEnvio }) {
  const { rotulo, tom } = SELOS[situacao];
  return <SeloStatus rotulo={rotulo} tom={tom} prefixo="Situação: " />;
}

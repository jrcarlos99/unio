import { useId, useState } from "react";
import { Clock, X } from "lucide-react";
import type { Reuniao } from "../../types/reunioes";
import { formatarDataCurta, formatarHora } from "../../utils/datas";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import { AvatarReuniao, ConfirmacaoInline } from "./Comuns";

interface PainelSolicitacoesProps {
  recebidas: Reuniao[];
  enviadas: Reuniao[];
  onVerHorarios: (reuniao: Reuniao) => void;
  onAbrirEnviada: (reuniao: Reuniao) => void;
  onRecusar: (reuniao: Reuniao) => Promise<void>;
  onCancelar: (reuniao: Reuniao) => Promise<void>;
}

function quandoSugerido(reuniao: Reuniao) {
  const [primeiro] = reuniao.horariosSugeridos;
  const total = reuniao.horariosSugeridos.length;
  const data = `${formatarDataCurta(primeiro)}, ${formatarHora(primeiro)}`;
  return total > 1 ? `${total} opções a partir de ${data}` : data;
}

function Contador({ valor, sufixo }: { valor: number; sufixo?: string }) {
  return (
    <span className="rounded-full bg-sage/30 px-2 py-0.5 text-xs font-bold text-deepgreen">
      {valor}
      {sufixo ? ` ${sufixo}` : ""}
    </span>
  );
}

// "Solicitações recebidas" e "Enviadas, aguardando" (coluna lateral no
// desktop; lista que abre do cartão "N solicitações" abaixo de lg)
export default function PainelSolicitacoes({
  recebidas,
  enviadas,
  onVerHorarios,
  onAbrirEnviada,
  onRecusar,
  onCancelar,
}: PainelSolicitacoesProps) {
  const id = useId();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao: () => Promise<void>) {
    setOcupado(true);
    try {
      await acao();
      setConfirmando(null);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby={`${id}-recebidas`} className="rounded-3xl border border-lightgray bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 id={`${id}-recebidas`} className="text-sm font-bold">
            Solicitações recebidas
          </h2>
          {recebidas.length > 0 && <Contador valor={recebidas.length} sufixo={recebidas.length === 1 ? "nova" : "novas"} />}
        </div>
        {recebidas.length === 0 ? (
          <p className="mt-2 text-sm text-deepgreen/75">Nenhuma solicitação aguardando sua resposta.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recebidas.map((reuniao) => (
              <li key={reuniao.id} className="rounded-2xl border border-lightgray p-3">
                <div className="flex items-start gap-3">
                  <AvatarReuniao iniciais={reuniao.contraparte.iniciais} tamanho="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{reuniao.contraparte.nome}</p>
                    <p className="truncate text-xs text-deepgreen/75">{reuniao.contraparte.subtitulo}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmando(reuniao.id)}
                    aria-label={`Recusar solicitação de ${reuniao.contraparte.nome}`}
                    aria-expanded={confirmando === reuniao.id}
                    className={`-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-deepgreen/70 hover:bg-red-50 hover:text-red-700 ${FOCO_VISIVEL}`}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-sm italic">“{reuniao.assunto}”</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-deepgreen/75">
                  <Clock size={12} aria-hidden="true" />
                  {quandoSugerido(reuniao)}
                </p>
                {confirmando === reuniao.id ? (
                  <div className="mt-3">
                    <ConfirmacaoInline
                      titulo={`Recusar a solicitação de ${reuniao.contraparte.nome}?`}
                      rotuloConfirmar="Recusar"
                      rotuloOcupado="Recusando..."
                      ocupado={ocupado}
                      onCancelar={() => setConfirmando(null)}
                      onConfirmar={() => executar(() => onRecusar(reuniao))}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onVerHorarios(reuniao)}
                    className={`mt-3 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl bg-deepgreen px-4 text-sm font-semibold text-white transition hover:bg-sage hover:text-deepgreen ${FOCO_VISIVEL}`}
                  >
                    Ver horários
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${id}-enviadas`} className="rounded-3xl border border-lightgray bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 id={`${id}-enviadas`} className="text-sm font-bold">
            Enviadas, aguardando
          </h2>
          {enviadas.length > 0 && <Contador valor={enviadas.length} />}
        </div>
        {enviadas.length === 0 ? (
          <p className="mt-2 text-sm text-deepgreen/75">Nenhuma solicitação enviada aguardando resposta.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {enviadas.map((reuniao) => (
              <li key={reuniao.id} className="rounded-2xl border border-dashed border-sage bg-sage/10 p-3">
                <button
                  type="button"
                  onClick={() => onAbrirEnviada(reuniao)}
                  className={`flex w-full items-start gap-3 rounded-xl text-left ${FOCO_VISIVEL}`}
                >
                  <AvatarReuniao iniciais={reuniao.contraparte.iniciais} tamanho="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{reuniao.contraparte.nome}</span>
                    <span className="block truncate text-xs italic">“{reuniao.assunto}”</span>
                    <span className="mt-1 block text-xs text-deepgreen/75">{quandoSugerido(reuniao)}</span>
                  </span>
                </button>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-deepgreen/80">
                  <Clock size={12} aria-hidden="true" />
                  Aguardando resposta de {reuniao.contraparte.nome}
                </p>
                {confirmando === reuniao.id ? (
                  <div className="mt-3">
                    <ConfirmacaoInline
                      titulo={`Cancelar a solicitação para ${reuniao.contraparte.nome}?`}
                      rotuloConfirmar="Cancelar solicitação"
                      rotuloOcupado="Cancelando..."
                      ocupado={ocupado}
                      onCancelar={() => setConfirmando(null)}
                      onConfirmar={() => executar(() => onCancelar(reuniao))}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmando(reuniao.id)}
                    className={`mt-2 inline-flex min-h-[36px] items-center rounded-lg px-2 text-xs font-semibold text-red-700 hover:bg-red-50 ${FOCO_VISIVEL}`}
                  >
                    Cancelar solicitação
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import { useCallback, useState } from "react";
import { ExternalLink } from "lucide-react";
import AdminPageHeader from "../components/AdminPageHeader";
import ModalConfirmacao from "../components/ModalConfirmacao";
import SeloSituacao from "../components/SeloSituacao";
import { BOTAO_SECUNDARIO } from "../../../components/reunioes/estilos";
import { FOCO_VISIVEL } from "../../../components/onboarding/selecao";
import { LEAN_CANVAS_BLOCKS } from "../../../components/pitch/leanCanvasBlocks";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { acoesDoEnvio } from "../../../services/moderacao.mapping";
import { aprovarEnvio, listarEnvios, removerEnvio } from "../../../services/moderacaoService";
import type { LeanCanvasField } from "../../../types/pitch";
import type { EnvioPitch, SituacaoEnvio } from "../types";

function formatarDataHora(iso: string | null) {
  if (!iso) return null;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const FILA: SituacaoEnvio[] = ["EM_REVISAO"];
const HISTORICO: SituacaoEnvio[] = ["PUBLICADO", "REMOVIDO"];

type Pedido = { acao: "aprovar" | "remover"; envio: EnvioPitch };

// Um envio com o conteúdo completo para revisão
function CartaoEnvio({ envio, onAcao }: { envio: EnvioPitch; onAcao: (pedido: Pedido) => void }) {
  const nome = envio.startupNome ?? envio.startupEmail ?? `Startup ${envio.startupId}`;
  const enviadoEm = formatarDataHora(envio.enviadoEm);
  const revisadoEm = formatarDataHora(envio.revisadoEm);
  const preenchidos = envio.canvas.filter((bloco) => bloco.texto).length;

  return (
    <article aria-label={`Pitch de ${nome}, versão ${envio.versao}`} className="rounded-2xl border border-deepgreen/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-deepgreen">{nome}</h3>
          <p className="text-xs text-deepgreen/75">
            Versão {envio.versao}
            {enviadoEm ? `, enviada em ${enviadoEm}` : ""}
            {envio.startupNome && envio.startupEmail ? `. ${envio.startupEmail}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SeloSituacao situacao={envio.situacao} />
          {!envio.atual && (
            <span className="rounded-full bg-lightgray px-3 py-1 text-xs font-semibold text-deepgreen">
              Substituído por um envio mais novo
            </span>
          )}
        </div>
      </div>

      {envio.motivo && <p className="mt-3 text-sm text-red-800">Motivo da remoção: {envio.motivo}</p>}
      {revisadoEm && (
        <p className="mt-1 text-xs text-deepgreen/75">
          Decidido em {revisadoEm}
          {envio.revisadoPor ? ` por ${envio.revisadoPor}` : ""}
        </p>
      )}

      <div className="mt-4 rounded-2xl bg-lightgray/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-deepgreen/75">Pitch curto</p>
        <p className="mt-1 whitespace-pre-line text-deepgreen">{envio.pitchCurto || "Sem texto"}</p>
        {envio.videoUrl && (
          <a
            href={envio.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 inline-flex items-center gap-1 break-all text-sm font-semibold text-deepgreen underline ${FOCO_VISIVEL}`}
          >
            <ExternalLink size={14} aria-hidden="true" />
            {envio.videoUrl}
            <span className="sr-only">(abre em outra aba)</span>
          </a>
        )}
      </div>

      <details className="mt-3 rounded-2xl border border-lightgray">
        <summary className={`cursor-pointer rounded-2xl px-4 py-3 text-sm font-semibold text-deepgreen ${FOCO_VISIVEL}`}>
          Lean Canvas ({preenchidos} de {envio.canvas.length} blocos preenchidos)
        </summary>
        <dl className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
          {envio.canvas.map((bloco) => (
            <div key={bloco.chave} className="rounded-xl bg-lightgray/30 p-3">
              <dt className="text-xs font-semibold text-deepgreen/80">
                {LEAN_CANVAS_BLOCKS[bloco.chave as LeanCanvasField]?.title ?? bloco.chave}
              </dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-deepgreen">{bloco.texto || "Não preenchido"}</dd>
            </div>
          ))}
        </dl>
      </details>

      {acoesDoEnvio(envio).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {acoesDoEnvio(envio).map((acao) => (
            <button
              key={acao}
              type="button"
              onClick={() => onAcao({ acao, envio })}
              className={`min-h-[44px] rounded-2xl px-4 text-sm font-semibold transition ${FOCO_VISIVEL} ${
                acao === "remover"
                  ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                  : "bg-deepgreen text-white hover:bg-sage hover:text-deepgreen"
              }`}
            >
              {acao === "aprovar" ? "Aprovar" : "Remover"}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

// Uma lista paginada de envios (fila ou histórico)
function ListaEnvios({
  titulo,
  situacoes,
  vazio,
  onAcao,
}: {
  titulo: string;
  situacoes: SituacaoEnvio[];
  vazio: string;
  onAcao: (pedido: Pedido) => void;
}) {
  const [deslocamento, setDeslocamento] = useState(0);
  const carregar = useCallback(() => listarEnvios(situacoes, deslocamento), [situacoes, deslocamento]);
  const { carregando, erro, dados, recarregar } = useCarregamento(carregar, "Não foi possível carregar os envios.");
  const total = dados?.total ?? 0;
  const limite = dados?.limite ?? 20;

  return (
    <section aria-label={titulo} className="mt-6">
      <h2 className="mb-3 text-xl font-bold text-deepgreen">
        {titulo}
        {dados ? ` (${total})` : ""}
      </h2>
      {carregando && (
        <p className="text-sm text-deepgreen" role="status">
          Carregando...
        </p>
      )}
      {erro && (
        <p className="text-sm text-red-700" role="alert">
          {erro}{" "}
          <button type="button" onClick={recarregar} className={`font-semibold underline ${FOCO_VISIVEL}`}>
            Tentar novamente
          </button>
        </p>
      )}
      {!carregando && !erro && dados && (
        <>
          {dados.itens.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-deepgreen/20 px-4 py-6 text-center text-sm text-deepgreen">
              {vazio}
            </p>
          ) : (
            <div className="space-y-4">
              {dados.itens.map((envio) => (
                <CartaoEnvio key={envio.id} envio={envio} onAcao={onAcao} />
              ))}
            </div>
          )}
          {total > limite && (
            <nav aria-label={`Páginas de ${titulo.toLowerCase()}`} className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={BOTAO_SECUNDARIO}
                disabled={deslocamento === 0}
                onClick={() => setDeslocamento((atual) => Math.max(0, atual - limite))}
              >
                Anterior
              </button>
              <button
                type="button"
                className={BOTAO_SECUNDARIO}
                disabled={deslocamento + limite >= total}
                onClick={() => setDeslocamento((atual) => atual + limite)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

// Moderação de conteúdo (RF08, ADR-013): pitches e Lean Canvas enviados pelas
// startups (GET /api/admin/moderation/content), com aprovar e remover. Cada
// decisão vai para o log de auditoria do back.
export default function ModeracaoConteudo() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [versao, setVersao] = useState(0);
  const [aviso, setAviso] = useState("");

  async function confirmar(motivo: string) {
    if (!pedido) return;
    const envio = pedido.acao === "aprovar" ? await aprovarEnvio(pedido.envio.id) : await removerEnvio(pedido.envio.id, motivo);
    const nome = envio.startupNome ?? envio.startupEmail ?? "a startup";
    setAviso(
      pedido.acao === "aprovar"
        ? `Pitch de ${nome} aprovado. Os investidores já podem ver.`
        : `Pitch de ${nome} removido. A startup vê o motivo.`,
    );
    setVersao((atual) => atual + 1);
  }

  const nomeDoPedido = pedido ? pedido.envio.startupNome ?? pedido.envio.startupEmail ?? "a startup" : "";

  return (
    <div>
      <AdminPageHeader
        title="Moderação de Conteúdo"
        subtitle="Pitches e Lean Canvas enviados pelas startups. Só o envio aprovado aparece para os investidores."
      />

      <p role="status" aria-live="polite" className={aviso ? "rounded-2xl bg-sage/20 px-4 py-3 text-sm text-deepgreen" : "sr-only"}>
        {aviso}
      </p>

      {/* key: depois de cada ação as duas listas recarregam do back */}
      <ListaEnvios
        key={`fila-${versao}`}
        titulo="Aguardando revisão"
        situacoes={FILA}
        vazio="Nenhum pitch aguardando revisão."
        onAcao={(novo) => {
          setAviso("");
          setPedido(novo);
        }}
      />
      <ListaEnvios
        key={`historico-${versao}`}
        titulo="Histórico de decisões"
        situacoes={HISTORICO}
        vazio="Nenhuma decisão registrada ainda."
        onAcao={(novo) => {
          setAviso("");
          setPedido(novo);
        }}
      />

      {pedido && (
        <ModalConfirmacao
          titulo={pedido.acao === "aprovar" ? `Aprovar o pitch de ${nomeDoPedido}?` : `Remover o pitch de ${nomeDoPedido}?`}
          descricao={
            pedido.acao === "aprovar"
              ? "O pitch e o Lean Canvas desta versão passam a aparecer para os investidores no perfil da startup."
              : "O pitch deixa de aparecer para os investidores. A startup vê o motivo e pode enviar uma nova versão."
          }
          rotuloConfirmar={pedido.acao === "aprovar" ? "Aprovar" : "Remover"}
          exigeMotivo={pedido.acao === "remover"}
          destrutiva={pedido.acao === "remover"}
          onConfirmar={confirmar}
          onFechar={() => setPedido(null)}
        />
      )}
    </div>
  );
}

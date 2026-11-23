import { useCallback, useState } from "react";
import { CircleAlert, ExternalLink, FileCheck, History, type LucideIcon } from "lucide-react";
import ModalConfirmacao from "../components/ModalConfirmacao";
import SeloSituacao from "../components/SeloSituacao";
import PainelCard from "../../../components/dashboard/PainelCard";
import AvisoEstado from "../../../components/discovery/AvisoEstado";
import CabecalhoPagina from "../../../components/discovery/CabecalhoPagina";
import { FOCO_VISIVEL } from "../../../components/onboarding/selecao";
import { LEAN_CANVAS_BLOCKS } from "../../../components/pitch/leanCanvasBlocks";
import { BOTAO_PERIGO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "../../../components/reunioes/estilos";
import EsqueletoBlocos from "../../../components/ui/EsqueletoBlocos";
import SeloStatus from "../../../components/ui/SeloStatus";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { useToast } from "../../../hooks/useToast";
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

// Um envio com o conteúdo completo para revisão, no mesmo cartão dos painéis do app
function CartaoEnvio({ envio, onAcao }: { envio: EnvioPitch; onAcao: (pedido: Pedido) => void }) {
  const nome = envio.startupNome ?? envio.startupEmail ?? `Startup ${envio.startupId}`;
  const enviadoEm = formatarDataHora(envio.enviadoEm);
  const revisadoEm = formatarDataHora(envio.revisadoEm);
  const preenchidos = envio.canvas.filter((bloco) => bloco.texto).length;
  const acoes = acoesDoEnvio(envio);

  return (
    <PainelCard
      nivel={3}
      titulo={nome}
      subtitulo={`Versão ${envio.versao}${enviadoEm ? `, enviada em ${enviadoEm}` : ""}${
        envio.startupNome && envio.startupEmail ? `. ${envio.startupEmail}` : ""
      }`}
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <SeloSituacao situacao={envio.situacao} />
          {!envio.atual && <SeloStatus rotulo="Substituído por um envio mais novo" tom="neutro" prefixo="" />}
        </div>
      }
    >
      {(envio.motivo || revisadoEm) && (
        <div className="mb-4 space-y-1">
          {envio.motivo && <p className="text-sm text-red-800">Motivo da remoção: {envio.motivo}</p>}
          {revisadoEm && (
            <p className="text-xs text-deepgreen/75">
              Decidido em {revisadoEm}
              {envio.revisadoPor ? ` por ${envio.revisadoPor}` : ""}
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-lightgray/40 p-4">
        <p className="text-sm font-semibold text-deepgreen/80">Pitch curto</p>
        <p className="mt-1 whitespace-pre-line text-deepgreen">{envio.pitchCurto || "Sem texto"}</p>
        {envio.videoUrl && (
          <a
            href={envio.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 inline-flex items-center gap-1 break-all rounded text-sm font-semibold text-deepgreen underline ${FOCO_VISIVEL}`}
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

      {acoes.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-lightgray pt-4">
          {acoes.map((acao) => (
            <button
              key={acao}
              type="button"
              onClick={() => onAcao({ acao, envio })}
              aria-label={`${acao === "aprovar" ? "Aprovar" : "Remover"} o pitch de ${nome}, versão ${envio.versao}`}
              className={acao === "remover" ? BOTAO_PERIGO : BOTAO_PRIMARIO}
            >
              {acao === "aprovar" ? "Aprovar" : "Remover"}
            </button>
          ))}
        </div>
      )}
    </PainelCard>
  );
}

// Uma lista paginada de envios (fila ou histórico)
function ListaEnvios({
  titulo,
  situacoes,
  vazio,
  iconeVazio,
  onAcao,
}: {
  titulo: string;
  situacoes: SituacaoEnvio[];
  vazio: string;
  iconeVazio: LucideIcon;
  onAcao: (pedido: Pedido) => void;
}) {
  const [deslocamento, setDeslocamento] = useState(0);
  const carregar = useCallback(() => listarEnvios(situacoes, deslocamento), [situacoes, deslocamento]);
  const { carregando, erro, dados, recarregar } = useCarregamento(carregar, "Não foi possível carregar os envios.");
  const total = dados?.total ?? 0;
  const limite = dados?.limite ?? 20;

  let conteudo;
  if (carregando) {
    conteudo = <EsqueletoBlocos rotulo={`Carregando ${titulo.toLowerCase()}`} quantidade={2} altura="h-48" className="space-y-5" />;
  } else if (erro || !dados) {
    conteudo = (
      <AvisoEstado
        erro
        icone={CircleAlert}
        titulo="Não foi possível carregar os envios"
        texto={erro ?? undefined}
        acao={
          <button type="button" onClick={recarregar} className={BOTAO_SECUNDARIO}>
            Tentar novamente
          </button>
        }
      />
    );
  } else if (dados.itens.length === 0) {
    conteudo = <AvisoEstado icone={iconeVazio} titulo={vazio} />;
  } else {
    conteudo = (
      <>
        <ul className="space-y-5">
          {dados.itens.map((envio) => (
            <li key={envio.id}>
              <CartaoEnvio envio={envio} onAcao={onAcao} />
            </li>
          ))}
        </ul>
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
    );
  }

  return (
    <section aria-label={titulo} className="mb-10 last:mb-0">
      <h2 className="mb-4 text-xl font-bold text-deepgreen">
        {titulo}
        {dados ? ` (${total})` : ""}
      </h2>
      {conteudo}
    </section>
  );
}

// Moderação de conteúdo (RF08, ADR-013): pitches e Lean Canvas enviados pelas
// startups (GET /api/admin/moderation/content), com aprovar e remover. Cada
// decisão vai para o log de auditoria do back. Cartões, botões, estados e
// toast iguais aos do restante do app (ADR-014).
export default function ModeracaoConteudo() {
  const { mostrar } = useToast();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [versao, setVersao] = useState(0);

  async function confirmar(motivo: string) {
    if (!pedido) return;
    const envio = pedido.acao === "aprovar" ? await aprovarEnvio(pedido.envio.id) : await removerEnvio(pedido.envio.id, motivo);
    const nome = envio.startupNome ?? envio.startupEmail ?? "a startup";
    mostrar(
      pedido.acao === "aprovar"
        ? `Pitch de ${nome} aprovado. Os investidores já podem ver.`
        : `Pitch de ${nome} removido. A startup vê o motivo.`,
    );
    setVersao((atual) => atual + 1);
  }

  const nomeDoPedido = pedido ? pedido.envio.startupNome ?? pedido.envio.startupEmail ?? "a startup" : "";

  return (
    <div>
      <CabecalhoPagina
        titulo="Moderação de conteúdo"
        subtitulo="Pitches e Lean Canvas enviados pelas startups. Só o envio aprovado aparece para os investidores."
      />

      {/* key: depois de cada ação as duas listas recarregam do back */}
      <ListaEnvios
        key={`fila-${versao}`}
        titulo="Aguardando revisão"
        situacoes={FILA}
        vazio="Nenhum pitch aguardando revisão"
        iconeVazio={FileCheck}
        onAcao={setPedido}
      />
      <ListaEnvios
        key={`historico-${versao}`}
        titulo="Histórico de decisões"
        situacoes={HISTORICO}
        vazio="Nenhuma decisão registrada ainda"
        iconeVazio={History}
        onAcao={setPedido}
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

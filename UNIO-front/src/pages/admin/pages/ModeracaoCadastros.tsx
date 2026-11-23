import { useCallback, useId, useState, type FormEvent } from "react";
import { CircleAlert, Search, SearchX, UserCheck } from "lucide-react";
import ModalConfirmacao from "../components/ModalConfirmacao";
import SeloSituacao from "../components/SeloSituacao";
import AvisoEstado from "../../../components/discovery/AvisoEstado";
import CabecalhoPagina from "../../../components/discovery/CabecalhoPagina";
import { BOTAO_PERIGO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ROTULO } from "../../../components/reunioes/estilos";
import DataTable from "../../../components/ui/DataTable";
import EsqueletoBlocos from "../../../components/ui/EsqueletoBlocos";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { useToast } from "../../../hooks/useToast";
import { acoesDaConta } from "../../../services/moderacao.mapping";
import { listarContasModeracao, moderarConta } from "../../../services/moderacaoService";
import type { AcaoConta, ContaModeracao, FiltroContas, PerfilModerado, SituacaoConta } from "../types";

function formatarData(iso: string | null) {
  if (!iso) return "Sem data";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "Sem data" : data.toLocaleDateString("pt-BR");
}

const OPCOES_SITUACAO: Array<{ valor: SituacaoConta | ""; rotulo: string }> = [
  { valor: "", rotulo: "Todas (aguardando primeiro)" },
  { valor: "PENDENTE", rotulo: "Aguardando aprovação" },
  { valor: "APROVADO", rotulo: "Aprovadas" },
  { valor: "SUSPENSO", rotulo: "Suspensas" },
  { valor: "RECUSADO", rotulo: "Recusadas" },
];

const OPCOES_PERFIL: Array<{ valor: PerfilModerado | ""; rotulo: string }> = [
  { valor: "", rotulo: "Todos" },
  { valor: "STARTUP", rotulo: "Startup" },
  { valor: "INVESTOR", rotulo: "Investidor" },
];

const ROTULO_ACAO: Record<AcaoConta, string> = {
  aprovar: "Aprovar",
  recusar: "Recusar",
  suspender: "Suspender",
  reativar: "Reativar",
};

const ROTULO_FEITO: Record<AcaoConta, string> = {
  aprovar: "Cadastro aprovado",
  recusar: "Cadastro recusado",
  suspender: "Conta suspensa",
  reativar: "Conta reativada",
};

// Recusar e suspender tiram a conta do ar: motivo obrigatório e botão vermelho
function ehDestrutiva(acao: AcaoConta) {
  return acao === "recusar" || acao === "suspender";
}

// Texto do modal de cada ação: o que muda para a conta
function textoDoModal(acao: AcaoConta, conta: ContaModeracao) {
  const nome = conta.nome ?? conta.email;
  switch (acao) {
    case "aprovar":
      return {
        titulo: `Aprovar o cadastro de ${nome}?`,
        descricao: "A conta passa a aparecer na descoberta e pode entrar normalmente.",
      };
    case "reativar":
      return {
        titulo: `Reativar a conta de ${nome}?`,
        descricao: "A conta volta a entrar e a aparecer na descoberta. Matches e reuniões continuam como estavam.",
      };
    case "suspender":
      return {
        titulo: `Suspender a conta de ${nome}?`,
        descricao:
          "A conta não consegue mais entrar e sai da descoberta e dos perfis públicos. Nada é apagado e você pode reativar depois.",
      };
    case "recusar":
      return {
        titulo: `Recusar o cadastro de ${nome}?`,
        descricao:
          "A conta não consegue mais entrar, sai da descoberta e as reuniões futuras dela são canceladas com aviso ao outro lado. Matches não são apagados.",
      };
  }
}

const FILTRO_INICIAL: FiltroContas = { situacao: "", perfil: "", busca: "", deslocamento: 0 };

// Moderação de cadastros (RF08, ADR-013): contas reais de
// GET /api/admin/moderation/accounts, com aprovar, recusar, suspender e
// reativar. Cada ação vai para o log de auditoria do back. Cabeçalho, campos,
// tabela, botões, estados e toast iguais aos do restante do app (ADR-014).
export default function ModeracaoCadastros() {
  const id = useId();
  const { mostrar } = useToast();
  const [filtro, setFiltro] = useState<FiltroContas>(FILTRO_INICIAL);
  const [busca, setBusca] = useState("");
  const [pedido, setPedido] = useState<{ acao: AcaoConta; conta: ContaModeracao } | null>(null);

  const carregar = useCallback(() => listarContasModeracao(filtro), [filtro]);
  const { carregando, erro, dados, recarregar, alterarDados } = useCarregamento(
    carregar,
    "Não foi possível carregar os cadastros.",
  );

  function aplicarBusca(event: FormEvent) {
    event.preventDefault();
    setFiltro((atual) => ({ ...atual, busca, deslocamento: 0 }));
  }

  function limparFiltros() {
    setBusca("");
    setFiltro(FILTRO_INICIAL);
  }

  async function confirmar(motivo: string) {
    if (!pedido) return;
    const atualizada = await moderarConta(pedido.conta.id, pedido.acao, motivo);
    // A linha mostra a situação nova; a ordem da lista muda na próxima carga
    alterarDados((pagina) => ({
      ...pagina,
      itens: pagina.itens.map((conta) => (conta.id === atualizada.id ? atualizada : conta)),
    }));
    mostrar(`${ROTULO_FEITO[pedido.acao]}: ${atualizada.email}. A ação foi registrada no log de auditoria.`);
  }

  const filtrado = filtro.situacao !== "" || filtro.perfil !== "" || filtro.busca !== "";
  const total = dados?.total ?? 0;
  const inicio = total === 0 ? 0 : filtro.deslocamento + 1;
  const fim = Math.min(filtro.deslocamento + (dados?.limite ?? 0), total);
  const modal = pedido ? textoDoModal(pedido.acao, pedido.conta) : null;

  let conteudo;
  if (carregando) {
    conteudo = <EsqueletoBlocos rotulo="Carregando cadastros" quantidade={5} altura="h-16" />;
  } else if (erro || !dados) {
    conteudo = (
      <AvisoEstado
        erro
        icone={CircleAlert}
        titulo="Não foi possível carregar os cadastros"
        texto={erro ?? undefined}
        acao={
          <button type="button" onClick={recarregar} className={BOTAO_SECUNDARIO}>
            Tentar novamente
          </button>
        }
      />
    );
  } else if (dados.itens.length === 0) {
    conteudo = (
      <AvisoEstado
        icone={filtrado ? SearchX : UserCheck}
        titulo={
          filtro.situacao === "PENDENTE" ? "Nenhuma conta aguardando aprovação" : "Nenhuma conta encontrada"
        }
        texto={filtrado ? "Tente outra situação, outro perfil ou outra busca." : undefined}
        acao={
          filtrado ? (
            <button type="button" onClick={limparFiltros} className={BOTAO_SECUNDARIO}>
              Limpar filtros
            </button>
          ) : undefined
        }
      />
    );
  } else {
    conteudo = (
      <>
        <DataTable
          legenda="Cadastros"
          rowKey={(conta) => conta.id}
          rows={dados.itens}
          columns={[
            {
              header: "Conta",
              render: (conta) => (
                <div className="min-w-0">
                  <p className="font-semibold">{conta.nome ?? conta.email}</p>
                  {conta.nome && <p className="text-xs text-deepgreen/75">{conta.email}</p>}
                </div>
              ),
            },
            { header: "Perfil", render: (conta) => conta.tipo },
            { header: "Cadastro", render: (conta) => formatarData(conta.dataCadastro), className: "whitespace-nowrap" },
            { header: "Perfil completo", render: (conta) => (conta.perfilCompleto ? "Sim" : "Não") },
            {
              header: "Situação",
              render: (conta) => (
                <div className="space-y-1">
                  <SeloSituacao situacao={conta.situacao} />
                  {conta.motivo && <p className="max-w-xs text-xs text-deepgreen/80">Motivo: {conta.motivo}</p>}
                </div>
              ),
            },
            {
              header: "Ações",
              // Botões numa linha: no celular a tabela rola dentro do cartão
              render: (conta) => (
                <div className="flex gap-2">
                  {acoesDaConta(conta.situacao).map((acao) => (
                    <button
                      key={acao}
                      type="button"
                      onClick={() => setPedido({ acao, conta })}
                      aria-label={`${ROTULO_ACAO[acao]} ${conta.nome ?? conta.email}`}
                      className={ehDestrutiva(acao) ? BOTAO_PERIGO : BOTAO_PRIMARIO}
                    >
                      {ROTULO_ACAO[acao]}
                    </button>
                  ))}
                </div>
              ),
            },
          ]}
        />

        <nav aria-label="Páginas de cadastros" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-deepgreen/80">
            {inicio} a {fim} de {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={BOTAO_SECUNDARIO}
              disabled={filtro.deslocamento === 0}
              onClick={() =>
                setFiltro((atual) => ({ ...atual, deslocamento: Math.max(0, atual.deslocamento - dados.limite) }))
              }
            >
              Anterior
            </button>
            <button
              type="button"
              className={BOTAO_SECUNDARIO}
              disabled={fim >= total}
              onClick={() => setFiltro((atual) => ({ ...atual, deslocamento: atual.deslocamento + dados.limite }))}
            >
              Próxima
            </button>
          </div>
        </nav>
      </>
    );
  }

  return (
    <div>
      <CabecalhoPagina titulo="Cadastros" subtitulo="Aprove, recuse, suspenda ou reative contas de startups e investidores." />

      <form
        onSubmit={aplicarBusca}
        role="search"
        aria-label="Filtrar cadastros"
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-end"
      >
        <div className="lg:w-60">
          <label htmlFor={`${id}-situacao`} className={ROTULO}>
            Situação
          </label>
          <select
            id={`${id}-situacao`}
            value={filtro.situacao}
            onChange={(event) =>
              setFiltro((atual) => ({ ...atual, situacao: event.target.value as SituacaoConta | "", deslocamento: 0 }))
            }
            className={`mt-1 ${CAMPO()}`}
          >
            {OPCOES_SITUACAO.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:w-44">
          <label htmlFor={`${id}-perfil`} className={ROTULO}>
            Perfil
          </label>
          <select
            id={`${id}-perfil`}
            value={filtro.perfil}
            onChange={(event) =>
              setFiltro((atual) => ({ ...atual, perfil: event.target.value as PerfilModerado | "", deslocamento: 0 }))
            }
            className={`mt-1 ${CAMPO()}`}
          >
            {OPCOES_PERFIL.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 sm:col-span-2 lg:flex-1">
          <label htmlFor={`${id}-busca`} className={ROTULO}>
            Buscar por e-mail ou nome
          </label>
          <div className="relative mt-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-deepgreen/75"
              aria-hidden="true"
            />
            <input
              id={`${id}-busca`}
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              className={`${CAMPO()} pl-11`}
            />
          </div>
        </div>
        <button type="submit" className={`${BOTAO_SECUNDARIO} sm:col-span-2`}>
          <Search size={16} aria-hidden="true" />
          Buscar
        </button>
      </form>

      {conteudo}

      {pedido && modal && (
        <ModalConfirmacao
          titulo={modal.titulo}
          descricao={modal.descricao}
          rotuloConfirmar={ROTULO_ACAO[pedido.acao]}
          exigeMotivo={ehDestrutiva(pedido.acao)}
          destrutiva={ehDestrutiva(pedido.acao)}
          onConfirmar={confirmar}
          onFechar={() => setPedido(null)}
        />
      )}
    </div>
  );
}

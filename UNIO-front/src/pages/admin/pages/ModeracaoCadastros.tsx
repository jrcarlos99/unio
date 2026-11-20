import { useEffect, useState } from "react";
import AdminPageHeader from "../components/AdminPageHeader";
import AvisoPendencia from "../components/AvisoPendencia";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import { useAudit } from "../context/AuditContext";
import api, { getApiErrorMessage } from "../../../services/api";
import type { CadastroPendente, StatusCadastro } from "../types";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Uma linha "rótulo: valor" dentro do modal de detalhes.
function LinhaDetalhe({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div className="border-b border-deepgreen/10 py-2 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-deepgreen">{label}</dt>
      <dd className="text-sm text-deepgreen">{valor}</dd>
    </div>
  );
}

export default function ModeracaoCadastros() {
  // Estado local só desta tela: aprovar/rejeitar não mexe em nenhum "banco".
  const [cadastros, setCadastros] = useState<CadastroPendente[]>([]);
  const [detalhe, setDetalhe] = useState<CadastroPendente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [erroApi, setErroApi] = useState("");
  const { registrarAcao } = useAudit();

  useEffect(() => {
    api.get<Array<{ id: string; email: string; role: string; createdAt: string }>>("/api/admin/users")
      .then(({ data }) =>
        setCadastros(
          data
            .filter((user) => user.role.toLowerCase() !== "admin")
            .map((user) => ({
            id: user.id,
            nome: user.email,
            tipo: user.role.toLowerCase() === "startup" ? "Startup" : "Investidor",
            dataCadastro: user.createdAt,
            status: "Pendente",
            detalhes: {},
            })),
        ),
      )
      .catch((error: unknown) => setErroApi(getApiErrorMessage(error, "Não foi possível carregar os usuários.")))
      .finally(() => setIsLoading(false));
  }, []);

  function atualizarStatus(id: string, novoStatus: StatusCadastro) {
    const cadastro = cadastros.find((item) => item.id === id);
    if (!cadastro || cadastro.status === novoStatus) return;

    setCadastros((atual) =>
      atual.map((item) => (item.id === id ? { ...item, status: novoStatus } : item))
    );

    const verbo = novoStatus === "Aprovado" ? "Aprovou" : "Rejeitou";
    registrarAcao(`${verbo} cadastro de ${cadastro.nome}`);
  }

  return (
    <div>
      <AdminPageHeader
        title="Moderação de Cadastros"
        subtitle="Aprove ou rejeite os cadastros de startups e investidores da plataforma."
      />
      <AvisoPendencia>
        Aprovar e rejeitar ainda não ficam salvos: o back-end não tem endpoint de moderação. A lista mostra os
        usuários cadastrados, mas o status volta para Pendente ao recarregar a página.
      </AvisoPendencia>
      {isLoading && <p className="mb-4 text-sm text-deepgreen">Carregando usuários...</p>}
      {erroApi && <p className="mb-4 text-sm text-red-600">{erroApi}</p>}

      <DataTable
        rowKey={(row) => row.id}
        rows={cadastros}
        columns={[
          { header: "Nome", render: (row) => <span className="font-medium text-deepgreen">{row.nome}</span> },
          { header: "Tipo", render: (row) => row.tipo },
          { header: "Data de Cadastro", render: (row) => formatarData(row.dataCadastro) },
          { header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          {
            header: "Ações",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => atualizarStatus(row.id, "Aprovado")}
                  disabled={row.status === "Aprovado"}
                  className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => atualizarStatus(row.id, "Rejeitado")}
                  disabled={row.status === "Rejeitado"}
                  className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={() => setDetalhe(row)}
                  className="rounded-full border border-deepgreen/40 px-3 py-1 text-xs font-semibold text-deepgreen transition-colors hover:bg-sage/20"
                >
                  Ver detalhes
                </button>
              </div>
            ),
          },
        ]}
      />

      {detalhe && (
        <Modal title={detalhe.nome} onClose={() => setDetalhe(null)}>
          <dl>
            <LinhaDetalhe label="Tipo" valor={detalhe.tipo} />
            <LinhaDetalhe label="Data de cadastro" valor={formatarData(detalhe.dataCadastro)} />

            {detalhe.tipo === "Startup" ? (
              <>
                <LinhaDetalhe label="Segmento" valor={detalhe.detalhes.segmento} />
                <LinhaDetalhe label="Estágio" valor={detalhe.detalhes.estagio} />
                <LinhaDetalhe
                  label="Necessidades"
                  valor={detalhe.detalhes.necessidades?.join(", ")}
                />
                <LinhaDetalhe label="Descrição" valor={detalhe.detalhes.descricao} />
              </>
            ) : (
              <>
                <LinhaDetalhe label="Tipo de perfil" valor={detalhe.detalhes.tipoPerfil} />
                <LinhaDetalhe
                  label="Área de interesse"
                  valor={detalhe.detalhes.areaInteresse?.join(", ")}
                />
                <LinhaDetalhe
                  label="Ticket médio"
                  valor={
                    detalhe.detalhes.ticketMedio
                      ? `R$ ${detalhe.detalhes.ticketMedio.toLocaleString("pt-BR")}`
                      : "Não informado"
                  }
                />
                <LinhaDetalhe label="Disponibilidade" valor={detalhe.detalhes.disponibilidade} />
              </>
            )}
          </dl>
        </Modal>
      )}
    </div>
  );
}

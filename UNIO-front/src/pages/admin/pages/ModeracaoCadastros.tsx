import AdminPageHeader from "../components/AdminPageHeader";
import AvisoPendencia from "../components/AvisoPendencia";
import DataTable from "../components/DataTable";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { listarUsuarios } from "../../../services/adminService";

function formatarData(iso: string | null) {
  if (!iso) return "—";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

// Contas cadastradas, direto de GET /api/admin/users (ADR-011). Aprovar e
// rejeitar não têm endpoint no back: os botões saíram, porque não salvavam
// nada. A tela volta a ter ações quando o back tiver a moderação.
export default function ModeracaoCadastros() {
  const { carregando, erro, dados, recarregar } = useCarregamento(
    listarUsuarios,
    "Não foi possível carregar os usuários.",
  );

  return (
    <div>
      <AdminPageHeader title="Cadastros" subtitle="Startups e investidores com conta na plataforma." />
      <AvisoPendencia>
        Aprovar e rejeitar cadastros ainda não estão disponíveis: o back-end não tem endpoint de moderação.
      </AvisoPendencia>
      {carregando && (
        <p className="mb-4 text-sm text-deepgreen" role="status">
          Carregando usuários...
        </p>
      )}
      {erro && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {erro}{" "}
          <button type="button" onClick={recarregar} className="font-semibold underline">
            Tentar novamente
          </button>
        </p>
      )}
      {!carregando && !erro && (
        <DataTable
          rowKey={(row) => row.id}
          rows={dados ?? []}
          emptyMessage="Nenhum cadastro ainda."
          columns={[
            {
              header: "E-mail",
              render: (row) => <span className="font-medium text-deepgreen">{row.excluida ? "Conta excluída" : row.email}</span>,
            },
            { header: "Tipo", render: (row) => row.tipo },
            { header: "Data de cadastro", render: (row) => formatarData(row.dataCadastro) },
            { header: "Situação", render: (row) => (row.excluida ? "Excluída pelo titular" : "Ativa") },
          ]}
        />
      )}
    </div>
  );
}

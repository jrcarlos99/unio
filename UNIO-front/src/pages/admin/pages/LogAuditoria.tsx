import AdminPageHeader from "../components/AdminPageHeader";
import DataTable from "../components/DataTable";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { listarAuditoria } from "../../../services/adminService";

// As 50 entradas mais recentes de GET /api/admin/audit (ADR-010 e ADR-011)
export default function LogAuditoria() {
  const { carregando, erro, dados, recarregar } = useCarregamento(
    listarAuditoria,
    "Não foi possível carregar o log de auditoria.",
  );
  return (
    <div>
      <AdminPageHeader title="Log de Auditoria" subtitle="As 50 ações mais recentes registradas pelo back-end." />
      {carregando && (
        <p className="mb-4 text-sm text-deepgreen" role="status">
          Carregando log...
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
          emptyMessage="Nenhuma ação registrada ainda."
          columns={[
            { header: "Data/Hora", render: (row) => row.dataHora },
            { header: "Usuário", render: (row) => row.usuario },
            { header: "Ação realizada", render: (row) => row.acao },
          ]}
        />
      )}
    </div>
  );
}

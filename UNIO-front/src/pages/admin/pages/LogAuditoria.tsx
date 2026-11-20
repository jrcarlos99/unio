import AdminPageHeader from "../components/AdminPageHeader";
import DataTable from "../components/DataTable";
import { useAudit } from "../context/AuditContext";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { ADMIN_REAL, listarAuditoria } from "../../../services/adminService";
import type { LogEntry } from "../types";

// Modo API: as 50 entradas mais recentes de GET /api/admin/audit (ADR-010).
// Modo mock: o log da sessão, que o AuditContext guarda do mais recente para
// o mais antigo.
export default function LogAuditoria() {
  return ADMIN_REAL ? <LogDoBack /> : <LogDaSessao />;
}

function Tabela({ logs, vazio }: { logs: LogEntry[]; vazio: string }) {
  return (
    <DataTable
      rowKey={(row) => row.id}
      rows={logs}
      emptyMessage={vazio}
      columns={[
        { header: "Data/Hora", render: (row) => row.dataHora },
        { header: "Usuário", render: (row) => row.usuario },
        { header: "Ação realizada", render: (row) => row.acao },
      ]}
    />
  );
}

function LogDoBack() {
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
      {!carregando && !erro && <Tabela logs={dados ?? []} vazio="Nenhuma ação registrada ainda." />}
    </div>
  );
}

function LogDaSessao() {
  const { logs } = useAudit();
  return (
    <div>
      <AdminPageHeader
        title="Log de Auditoria"
        subtitle="Ações de moderação realizadas nesta sessão, mais recentes primeiro."
      />
      <Tabela
        logs={logs}
        vazio="Nenhuma ação registrada ainda. Aprove, rejeite ou remova algo nas telas de moderação."
      />
    </div>
  );
}

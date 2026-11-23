import { CircleAlert, History } from "lucide-react";
import AvisoEstado from "../../../components/discovery/AvisoEstado";
import CabecalhoPagina from "../../../components/discovery/CabecalhoPagina";
import { BOTAO_SECUNDARIO } from "../../../components/reunioes/estilos";
import DataTable from "../../../components/ui/DataTable";
import EsqueletoBlocos from "../../../components/ui/EsqueletoBlocos";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { listarAuditoria } from "../../../services/adminService";

// As 50 entradas mais recentes de GET /api/admin/audit (ADR-010 e ADR-011),
// com o cabeçalho, a tabela e os estados do restante do app (ADR-014)
export default function LogAuditoria() {
  const { carregando, erro, dados, recarregar } = useCarregamento(
    listarAuditoria,
    "Não foi possível carregar o log de auditoria.",
  );

  let conteudo;
  if (carregando) {
    conteudo = <EsqueletoBlocos rotulo="Carregando log de auditoria" quantidade={6} altura="h-14" />;
  } else if (erro) {
    conteudo = (
      <AvisoEstado
        erro
        icone={CircleAlert}
        titulo="Não foi possível carregar o log de auditoria"
        texto={erro}
        acao={
          <button type="button" onClick={recarregar} className={BOTAO_SECUNDARIO}>
            Tentar novamente
          </button>
        }
      />
    );
  } else if (!dados || dados.length === 0) {
    conteudo = (
      <AvisoEstado
        icone={History}
        titulo="Nenhuma ação registrada ainda"
        texto="As ações registradas pelo back-end aparecem aqui assim que acontecerem."
      />
    );
  } else {
    conteudo = (
      <DataTable
        legenda="Log de auditoria"
        rowKey={(row) => row.id}
        rows={dados}
        columns={[
          { header: "Data e hora", render: (row) => row.dataHora, className: "whitespace-nowrap" },
          { header: "Usuário", render: (row) => row.usuario, className: "break-all" },
          { header: "Ação realizada", render: (row) => row.acao },
        ]}
      />
    );
  }

  return (
    <div>
      <CabecalhoPagina titulo="Log de auditoria" subtitulo="As 50 ações mais recentes registradas pelo back-end." />
      {conteudo}
    </div>
  );
}

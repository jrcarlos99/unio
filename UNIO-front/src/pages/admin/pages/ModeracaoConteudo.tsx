import { useState } from "react";
import AdminPageHeader from "../components/AdminPageHeader";
import AvisoPendencia from "../components/AvisoPendencia";
import { useAudit } from "../context/AuditContext";

// Dados permanecem mockados até existir um endpoint de moderação de conteúdo no back-end.
import { CONTEUDO_MOCK } from "../data/mockAdmin";
import type { ConteudoPublicado } from "../types";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function ModeracaoConteudo() {
  const [conteudos, setConteudos] = useState<ConteudoPublicado[]>(CONTEUDO_MOCK);
  const { registrarAcao } = useAudit();

  function remover(id: string) {
    const item = conteudos.find((c) => c.id === id);
    if (!item) return;

    // Some da lista (não tem "lixeira" nessa demo) e vira uma linha no log.
    setConteudos((atual) => atual.filter((c) => c.id !== id));
    registrarAcao(`Removeu conteúdo de ${item.startup}`);
  }

  function sinalizar(id: string) {
    const item = conteudos.find((c) => c.id === id);
    if (!item || item.sinalizado) return;

    setConteudos((atual) =>
      atual.map((c) => (c.id === id ? { ...c, sinalizado: true } : c))
    );
    registrarAcao(`Sinalizou conteúdo de ${item.startup}`);
  }

  return (
    <div>
      <AdminPageHeader
        title="Moderação de Conteúdo"
        subtitle="Pitches e canvases publicados pelas startups na plataforma."
      />
      <AvisoPendencia>
        Dados de exemplo: o back-end ainda não tem moderação de conteúdo. Remover um item aqui não muda nada na
        plataforma.
      </AvisoPendencia>

      {conteudos.length === 0 ? (
        <p className="rounded-2xl border border-deepgreen/10 bg-lightgray p-5 text-center text-deepgreen">
          Nenhum conteúdo publicado no momento.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {conteudos.map((item) => (
            <div key={item.id} className="flex flex-col rounded-2xl border border-deepgreen/10 bg-lightgray p-5 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-semibold text-deepgreen">{item.startup}</h2>
                {item.sinalizado && (
                  <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Sinalizado
                  </span>
                )}
              </div>
              <p className="mb-2 text-xs text-deepgreen">{formatarData(item.dataPublicacao)}</p>
              <p className="mb-4 flex-1 text-sm text-deepgreen/90">{item.trecho}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => remover(item.id)}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Remover
                </button>
                <button
                  type="button"
                  onClick={() => sinalizar(item.id)}
                  disabled={item.sinalizado}
                  className="rounded-full border border-deepgreen/40 px-4 py-1.5 text-xs font-semibold text-deepgreen transition-colors hover:bg-sage/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sinalizar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

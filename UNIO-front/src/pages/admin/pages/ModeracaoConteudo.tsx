import { FileWarning } from "lucide-react";
import AdminPageHeader from "../components/AdminPageHeader";

// O back ainda não tem moderação de conteúdo (listar, remover ou sinalizar
// pitches). Em vez de uma lista de exemplo, a tela diz que o recurso ainda
// não está disponível (ADR-011).
export default function ModeracaoConteudo() {
  return (
    <div>
      <AdminPageHeader
        title="Moderação de Conteúdo"
        subtitle="Pitches e canvases publicados pelas startups na plataforma."
      />
      <div
        role="status"
        className="flex flex-col items-center rounded-2xl border border-deepgreen/10 bg-lightgray p-8 text-center text-deepgreen"
      >
        <FileWarning size={28} aria-hidden="true" />
        <p className="mt-3 font-semibold">Ainda não disponível</p>
        <p className="mt-1 max-w-md text-sm text-deepgreen/80">
          O back-end ainda não tem endpoint de moderação de conteúdo. Quando tiver, os conteúdos publicados aparecem
          aqui.
        </p>
      </div>
    </div>
  );
}

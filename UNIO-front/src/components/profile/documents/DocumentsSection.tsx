import { useRef, useState } from "react";
import { CircleAlert, FilePlus, FolderOpen } from "lucide-react";
import type { StartupDocuments } from "../../../hooks/useStartupDocuments";
import type { DocumentFormValues, StartupDocument } from "../../../types/documents";
import { CATEGORY_LABELS, DOCUMENTS_MAX, EMPTY_DOCUMENT_FORM, documentFormFor } from "../../../utils/documents";
import AvisoEstado from "../../discovery/AvisoEstado";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "../../pitch/styles";
import DocumentCard from "./DocumentCard";
import DocumentFormDialog from "./DocumentFormDialog";
import DocumentsSkeleton from "./DocumentsSkeleton";
import RecommendedChecklist from "./RecommendedChecklist";
import RemoveDocumentDialog from "./RemoveDocumentDialog";

interface DocumentsSectionProps {
  documents: StartupDocuments;
}

type DialogState =
  | { kind: "form"; document: StartupDocument | null; initialValues: DocumentFormValues }
  | { kind: "remove"; document: StartupDocument }
  | null;

const HEADING_ID = "documents-heading";
const LIMIT_ID = "documents-limit";

// Content of the "Documentos" tab of "Meu Perfil": header, recommended
// checklist, documents grouped by category (or empty state) and the
// add/edit/remove dialogs. Data and actions come from useStartupDocuments
// (called by the page). Same structure as team/TeamSection.tsx.
export default function DocumentsSection({ documents }: DocumentsSectionProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  // Receives focus when the element that opened a dialog is gone
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { groups, count } = documents;

  function openNew(initialValues: DocumentFormValues = EMPTY_DOCUMENT_FORM) {
    setDialog({ kind: "form", document: null, initialValues });
  }

  const addButton = (
    <button
      type="button"
      onClick={() => openNew()}
      disabled={!documents.canAdd}
      aria-describedby={documents.canAdd ? undefined : LIMIT_ID}
      className={PRIMARY_BUTTON}
    >
      <FilePlus size={18} aria-hidden="true" />
      Adicionar documento
    </button>
  );

  let content;
  if (documents.loading) {
    content = <DocumentsSkeleton />;
  } else if (documents.loadError) {
    content = (
      <div className="mt-5">
        <AvisoEstado
          erro
          icone={CircleAlert}
          titulo="Não foi possível carregar os documentos"
          texto={documents.loadError}
          acao={
            <button type="button" onClick={documents.reload} className={OUTLINE_BUTTON}>
              Tentar novamente
            </button>
          }
        />
      </div>
    );
  } else {
    content = (
      <>
        <RecommendedChecklist
          covered={documents.covered}
          canAdd={documents.canAdd}
          onAdd={(item) => openNew(documentFormFor(item))}
        />
        {groups.length === 0 ? (
          <div className="mt-6">
            <AvisoEstado
              icone={FolderOpen}
              titulo="Nenhum documento adicionado ainda"
              texto="Reúna aqui os links dos materiais que investidores pedem na análise: pitch deck, plano financeiro, contrato social e outros."
              acao={addButton}
            />
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.category} aria-labelledby={`documents-group-${group.category}`} className="mt-6">
              <h3 id={`documents-group-${group.category}`} className="text-lg font-bold text-deepgreen">
                {CATEGORY_LABELS[group.category]}
                <span className="font-normal text-deepgreen/75"> ({group.documents.length})</span>
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {group.documents.map((document) => (
                  <li key={document.id} className="min-w-0">
                    <DocumentCard
                      document={document}
                      onEdit={() => setDialog({ kind: "form", document, initialValues: EMPTY_DOCUMENT_FORM })}
                      onRemove={() => setDialog({ kind: "remove", document })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </>
    );
  }

  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} ref={headingRef} tabIndex={-1} className="sr-only">
        Documentos{count !== null && count > 0 && ` (${count})`}
      </h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm text-deepgreen/80">
          Organize os materiais que investidores costumam pedir na análise da startup.
        </p>
        {count !== null && count > 0 && (
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            {addButton}
            {!documents.canAdd && (
              <p id={LIMIT_ID} className="text-xs text-deepgreen/75">
                Limite de {DOCUMENTS_MAX} documentos atingido.
              </p>
            )}
          </div>
        )}
      </div>

      {content}

      {dialog?.kind === "form" && (
        <DocumentFormDialog
          document={dialog.document}
          initialValues={dialog.initialValues}
          fallbackFocusRef={headingRef}
          onSubmit={(values) => documents.saveDocument(values, dialog.document?.id ?? null)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "remove" && (
        <RemoveDocumentDialog
          documentTitle={dialog.document.title}
          fallbackFocusRef={headingRef}
          onConfirm={() => documents.removeDocument(dialog.document.id)}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}

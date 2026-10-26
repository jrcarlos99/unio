import { useId } from "react";
import type { StartupDocument } from "../../../types/documents";
import { CATEGORY_LABELS, FORMAT_LABELS, formatDocumentDate, parseDocumentUrl, sourceDomain } from "../../../utils/documents";
import { CHIP } from "../../pitch/styles";
import DocumentActionsMenu from "./DocumentActionsMenu";
import DocumentIcon from "./DocumentIcon";

interface DocumentCardProps {
  document: StartupDocument;
  onEdit: () => void;
  onRemove: () => void;
}

export default function DocumentCard({ document, onEdit, onRemove }: DocumentCardProps) {
  const titleId = useId();
  const url = parseDocumentUrl(document.url);
  const domain = url ? sourceDomain(url) : "";
  const addedOn = formatDocumentDate(document.createdAt);

  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full flex-col rounded-3xl border border-lightgray bg-white p-5 shadow-soft"
    >
      <div className="flex items-start gap-3">
        <DocumentIcon format={document.format} />
        <div className="min-w-0 flex-1">
          <h4 id={titleId} className="break-words text-lg font-bold leading-tight text-deepgreen">
            {document.title}
          </h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-deepgreen/75">
            <span className={`${CHIP} bg-sage/30 text-deepgreen`}>{CATEGORY_LABELS[document.category]}</span>
            <span className="font-semibold text-deepgreen">{FORMAT_LABELS[document.format]}</span>
            {domain && (
              <>
                <span aria-hidden="true">·</span>
                <span className="break-all">{domain}</span>
              </>
            )}
          </div>
        </div>
        <div className="-mr-2 -mt-2 shrink-0">
          <DocumentActionsMenu documentTitle={document.title} url={url} onEdit={onEdit} onRemove={onRemove} />
        </div>
      </div>

      {document.description && (
        <p className="mt-4 line-clamp-2 break-words text-sm leading-relaxed text-deepgreen/90">{document.description}</p>
      )}

      {addedOn && (
        <div className="mt-auto pt-4">
          <p className="border-t border-lightgray pt-3 text-xs text-deepgreen/75">
            Adicionado em <time dateTime={document.createdAt}>{addedOn}</time>
          </p>
        </div>
      )}
    </article>
  );
}

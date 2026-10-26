import { FileImage, FileSpreadsheet, FileText, FileType, Link, Presentation, type LucideIcon } from "lucide-react";
import type { DocumentFormat } from "../../../types/documents";

const ICONS: Record<DocumentFormat, LucideIcon> = {
  pdf: FileText,
  documento: FileType,
  planilha: FileSpreadsheet,
  apresentacao: Presentation,
  imagem: FileImage,
  outro: Link,
};

export default function DocumentIcon({ format }: { format: DocumentFormat }) {
  const Icon = ICONS[format];
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lightgray text-deepgreen"
    >
      <Icon size={22} />
    </span>
  );
}

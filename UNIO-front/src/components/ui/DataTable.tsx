import type { ReactNode } from "react";

// Cada coluna sabe só o título e como renderizar a célula a partir da linha.
// É esse "render" que deixa a mesma tabela servir pra dados bem diferentes
// (cadastros, log de auditoria, etc.).
interface Coluna<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  // Nome da tabela para leitores de tela (legenda e região rolável)
  legenda: string;
  columns: Coluna<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}

// Tabela no mesmo cartão dos painéis do app (borda lightgray, raio 3xl,
// sombra soft). No celular rola na horizontal dentro do cartão, sem quebrar a
// página; a região recebe foco para rolar pelo teclado. O estado vazio fica
// com quem usa (AvisoEstado), como nas outras listas do app.
export default function DataTable<T>({ legenda, columns, rows, rowKey }: DataTableProps<T>) {
  return (
    <div
      role="region"
      aria-label={legenda}
      tabIndex={0}
      className="overflow-x-auto rounded-3xl border border-lightgray bg-white shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deepgreen focus-visible:ring-offset-2"
    >
      <table className="w-full min-w-[640px] text-left text-sm text-deepgreen">
        <caption className="sr-only">{legenda}</caption>
        <thead className="border-b border-lightgray bg-lightgray/40">
          <tr>
            {columns.map((coluna) => (
              <th key={coluna.header} scope="col" className="px-4 py-3 font-semibold text-deepgreen/80">
                {coluna.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-lightgray transition first:border-t-0 hover:bg-lightgray/20">
              {columns.map((coluna) => (
                <td key={coluna.header} className={`px-4 py-4 align-middle ${coluna.className ?? ""}`}>
                  {coluna.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

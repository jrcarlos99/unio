import type { ReactNode } from "react";
import { CircleAlert, Sparkles } from "lucide-react";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import AvisoEstado from "./AvisoEstado";
import StartupCardSkeleton from "./StartupCardSkeleton";

export const POR_PAGINA = 6;

// Grade de cards de recomendação (Descobrir, Investidores e Salvos). A 4ª
// coluna evita cards largos demais no AppLayout fluido; entra só a partir de
// 1700px de janela porque, com a sidebar, cada card fica com ~325px (no 2xl,
// 1536px, ficaria com ~285px e os valores de captação quebram linha).
export const GRADE_CARDS = "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4";

const BOTAO_CLARO = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-lightgray bg-white px-4 text-sm font-semibold text-deepgreen transition hover:border-sage ${FOCO_VISIVEL}`;

interface GradeRecomendacoesProps {
  titulo: string;
  selo: string;
  carregando: boolean;
  erro: string | null;
  // Mensagem do erro ("Não foi possível carregar as recomendações")
  tituloErro: string;
  onTentarNovamente: () => void;
  // Total antes dos filtros e depois dos filtros
  total: number;
  totalFiltrado: number;
  // Cards já cortados pelo limite da "página"
  cards: { chave: string; card: ReactNode }[];
  onVerMais: () => void;
  // Estados vazios: lista vazia e filtros sem resultado
  vazio: ReactNode;
  semResultado: ReactNode;
}

// Seção "X para você": título + selo + "Visualizando: N de M", grade de
// cards com "Ver mais" e os estados de carregando, erro e vazio
export default function GradeRecomendacoes({
  titulo,
  selo,
  carregando,
  erro,
  tituloErro,
  onTentarNovamente,
  total,
  totalFiltrado,
  cards,
  onVerMais,
  vazio,
  semResultado,
}: GradeRecomendacoesProps) {
  let conteudo: ReactNode;
  if (carregando) {
    conteudo = (
      <div className={GRADE_CARDS} aria-busy="true">
        <span className="sr-only">Carregando recomendações</span>
        {Array.from({ length: POR_PAGINA }, (_, i) => (
          <StartupCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (erro) {
    conteudo = (
      <AvisoEstado
        erro
        icone={CircleAlert}
        titulo={tituloErro}
        texto={erro}
        acao={
          <button type="button" onClick={onTentarNovamente} className={BOTAO_CLARO}>
            Tentar novamente
          </button>
        }
      />
    );
  } else if (total === 0) {
    conteudo = vazio;
  } else if (totalFiltrado === 0) {
    conteudo = semResultado;
  } else {
    conteudo = (
      <>
        <ul className={GRADE_CARDS}>
          {cards.map(({ chave, card }) => (
            <li key={chave}>{card}</li>
          ))}
        </ul>
        {cards.length < totalFiltrado && (
          <div className="mt-6 flex justify-center">
            <button type="button" onClick={onVerMais} className={BOTAO_CLARO}>
              Ver mais oportunidades ({totalFiltrado - cards.length})
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="titulo-recomendacoes" className="mt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="titulo-recomendacoes" className="text-2xl font-bold text-deepgreen">
            {titulo}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sage bg-sage/20 px-3 py-1 text-xs font-medium text-deepgreen">
            <Sparkles size={12} aria-hidden="true" />
            {selo}
          </span>
        </div>
        {!carregando && !erro && (
          <p className="text-sm text-deepgreen/80" aria-live="polite">
            Visualizando:{" "}
            <strong className="font-bold text-deepgreen">
              {cards.length} de {totalFiltrado} {totalFiltrado === 1 ? "oportunidade" : "oportunidades"}
            </strong>
          </p>
        )}
      </div>
      {conteudo}
    </section>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight, Check, HeartHandshake, Hourglass, Sparkles, ThumbsUp } from "lucide-react";
import type { StatusInteresse } from "../../types/discovery";
import { linkMeusUnios } from "../../utils/rotasUnio";
import { FOCO_VISIVEL } from "../onboarding/selecao";

interface InteresseButtonProps {
  // id da startup/investidor: "Ver em Meus unios" abre o popup desse unio
  id: string;
  status: StatusInteresse;
  // Nome de quem recebe o interesse (startup ou investidor)
  nome: string;
  // Texto enquanto o outro lado não responde
  aguardando?: string;
  onInteresse: () => void;
  onDesfazer: () => void;
  ocupado?: boolean;
  // card: seta no fim (home); perfil: ícone de joinha no começo
  variante?: "card" | "perfil";
  // O outro lado já demonstrou interesse: o botão vira "Também tenho
  // interesse" e o clique fecha o match na hora (ADR-015)
  recebido?: boolean;
}

const BASE = `inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition ${FOCO_VISIVEL}`;

// Centraliza os 3 estados do match mútuo:
// nenhum → "Tenho interesse" (ou "Também tenho interesse", se o outro lado
// já demonstrou); enviado → "Interesse enviado" (aguardando o
// outro lado, com opção de desfazer); match → acesso a "Meus unios". Serve
// aos dois perfis: investidor → startup e startup → investidor.
export default function InteresseButton({
  id,
  status,
  nome,
  aguardando = "Aguardando a startup",
  onInteresse,
  onDesfazer,
  ocupado = false,
  variante = "card",
  recebido = false,
}: InteresseButtonProps) {
  if (status === "match") {
    return (
      <Link to={linkMeusUnios(id)} className={`${BASE} bg-sage text-deepgreen hover:bg-sage/80`}>
        <Sparkles size={16} aria-hidden="true" />
        Ver em Meus unios
      </Link>
    );
  }

  if (status === "enviado") {
    return (
      <div>
        <button type="button" disabled className={`${BASE} cursor-not-allowed bg-lightgray text-deepgreen`}>
          <Check size={16} strokeWidth={2.5} aria-hidden="true" />
          Interesse enviado
        </button>
        <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 text-xs text-deepgreen/75">
          <Hourglass size={12} aria-hidden="true" />
          {aguardando}
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onDesfazer}
            disabled={ocupado}
            aria-label={`Desfazer interesse em ${nome}`}
            className={`rounded font-semibold text-deepgreen underline underline-offset-2 hover:no-underline disabled:opacity-60 ${FOCO_VISIVEL}`}
          >
            Desfazer interesse
          </button>
        </p>
      </div>
    );
  }

  if (recebido) {
    return (
      <button
        type="button"
        onClick={onInteresse}
        disabled={ocupado}
        aria-busy={ocupado}
        aria-label={`Também tenho interesse em ${nome}`}
        className={`${BASE} bg-deepgreen text-white hover:bg-sage hover:text-deepgreen disabled:cursor-wait disabled:opacity-70`}
      >
        <HeartHandshake size={16} aria-hidden="true" />
        {ocupado ? "Enviando..." : "Também tenho interesse"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onInteresse}
      disabled={ocupado}
      aria-busy={ocupado}
      aria-label={`Tenho interesse em ${nome}`}
      className={`${BASE} bg-deepgreen text-white hover:bg-sage hover:text-deepgreen disabled:cursor-wait disabled:opacity-70`}
    >
      {variante === "perfil" && <ThumbsUp size={16} aria-hidden="true" />}
      {ocupado ? "Enviando..." : "Tenho interesse"}
      {variante === "card" && !ocupado && <ArrowRight size={16} aria-hidden="true" />}
    </button>
  );
}

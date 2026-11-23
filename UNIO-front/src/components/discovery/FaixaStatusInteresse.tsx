import { Link } from "react-router-dom";
import { HeartHandshake, Hourglass, Sparkles } from "lucide-react";
import type { StatusInteresse } from "../../types/discovery";
import { linkMeusUnios } from "../../utils/rotasUnio";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import { BOTAO_PRIMARIO } from "../reunioes/estilos";

interface FaixaStatusInteresseProps {
  // id da startup/investidor do perfil (para abrir o popup do unio)
  id: string;
  status: StatusInteresse;
  // "a startup" / "o investidor"
  outroLado: string;
  // O outro lado demonstrou interesse e eu ainda não retribuí (ADR-015)
  recebido?: boolean;
  nome?: string;
  onRetribuir?: () => void;
  ocupado?: boolean;
}

// Faixa discreta no topo de um perfil com o estado do interesse (recebido /
// enviado / match)
export default function FaixaStatusInteresse({
  id,
  status,
  outroLado,
  recebido = false,
  nome,
  onRetribuir,
  ocupado = false,
}: FaixaStatusInteresseProps) {
  if (status === "nenhum" && recebido && onRetribuir) {
    const quem = `${outroLado.charAt(0).toUpperCase()}${outroLado.slice(1)}${nome ? ` ${nome}` : ""}`;
    return (
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-sage bg-sage/20 px-4 py-3 text-sm text-deepgreen sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <HeartHandshake size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">{quem} demonstrou interesse em você.</span> Retribua para dar match e
            liberar o contato.
          </span>
        </p>
        <button
          type="button"
          onClick={onRetribuir}
          disabled={ocupado}
          aria-busy={ocupado}
          className={`${BOTAO_PRIMARIO} shrink-0 disabled:cursor-wait`}
        >
          {ocupado ? "Enviando..." : "Também tenho interesse"}
        </button>
      </div>
    );
  }
  if (status === "nenhum") return null;
  if (status === "match") {
    return (
      <p className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-sage/40 px-4 py-3 text-sm font-semibold text-deepgreen">
        <Sparkles size={16} aria-hidden="true" />
        Deu match!
        <Link to={linkMeusUnios(id)} className={`rounded underline underline-offset-2 hover:no-underline ${FOCO_VISIVEL}`}>
          Veja em Meus unios
        </Link>
      </p>
    );
  }
  return (
    <p className="mb-4 flex items-center gap-2 rounded-2xl bg-lightgray/70 px-4 py-3 text-sm text-deepgreen">
      <Hourglass size={16} aria-hidden="true" />
      Interesse enviado, aguardando {outroLado}
    </p>
  );
}

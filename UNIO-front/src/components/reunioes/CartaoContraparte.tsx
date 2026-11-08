import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ContraparteReuniao } from "../../types/reunioes";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import { AvatarReuniao, SeloMatch } from "./Comuns";

interface CartaoContraparteProps {
  contraparte: ContraparteReuniao;
  rotuloPerfil: string;
  // Fecha o drawer ao navegar para o perfil
  onNavegar: () => void;
  children?: ReactNode;
}

// Quem é a outra parte: avatar, nome, cargo/empresa, selos, % de match,
// link para o perfil completo e a faixa informativa por perfil
export default function CartaoContraparte({ contraparte, rotuloPerfil, onNavegar, children }: CartaoContraparteProps) {
  return (
    <section aria-label={`Sobre ${contraparte.nome}`} className="rounded-2xl border border-lightgray p-4">
      <div className="flex items-start gap-3">
        <AvatarReuniao iniciais={contraparte.iniciais} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{contraparte.nome}</p>
          <p className="truncate text-sm text-deepgreen/75">{contraparte.cargoEmpresa}</p>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Resumo">
        {contraparte.selos.map((selo) => (
          <li key={selo} className="rounded-full bg-lightgray px-2.5 py-0.5 text-xs font-medium">
            {selo}
          </li>
        ))}
        <li>
          <SeloMatch valor={contraparte.matchPercentual} />
        </li>
      </ul>
      {contraparte.destaque && (
        <p className="mt-3 rounded-xl bg-lightgray/50 px-3 py-2 text-sm">
          <span className="text-deepgreen/75">{contraparte.destaque.rotulo}: </span>
          <span className="font-bold">{contraparte.destaque.valor}</span>
        </p>
      )}
      {children}
      <Link
        to={contraparte.perfilHref}
        onClick={onNavegar}
        className={`mt-3 inline-flex items-center gap-1 rounded text-sm font-semibold hover:underline ${FOCO_VISIVEL}`}
      >
        {rotuloPerfil}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}

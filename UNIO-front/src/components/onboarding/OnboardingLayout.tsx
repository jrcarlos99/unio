import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import type { PerfilOnboarding } from "../../types/onboarding";
import InfoNote from "./InfoNote";
import { FOCO_VISIVEL } from "./selecao";
import Logo from "../brand/Logo";

const BADGE_PERFIL: Record<PerfilOnboarding, string> = {
  investidor: "Investor & Mentor",
  startup: "STARTUP",
};

// Mesma largura pro cabeçalho e o rodapé; o conteúdo usa uma coluna mais
// estreita no meio.
const CONTAINER_LARGO = "mx-auto w-full max-w-[1200px] px-5 md:px-12";
const CONTAINER_CONTEUDO = "mx-auto w-full max-w-[832px] px-5 md:px-6";

interface OnboardingLayoutProps {
  perfil: PerfilOnboarding;
  etapas: string[];
  passo: number;
  titulo: string;
  subtitulo: string;
  aviso: ReactNode;
  // Texto que substitui o "Pular por enquanto" no último passo
  statusFinal: string;
  onSkip: () => void;
  // false = conta sem perfil: o onboarding é obrigatório, então o "Pular por
  // enquanto" some de todos os passos e o cabeçalho mostra avisoObrigatorio
  podePular?: boolean;
  avisoObrigatorio?: string;
  // Faixa de erro acima do botão principal (ex.: falha ao criar o perfil)
  erro?: string | null;
  // Mostra "Tentar novamente" na faixa de erro
  onTentarNovamente?: () => void;
  onGoTo: (passo: number) => void;
  // Rodapé
  resumo: string;
  resumoAtivo: boolean;
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  primaryIcon?: LucideIcon;
  primaryDisabled: boolean;
  ocupado?: boolean;
  children: ReactNode;
}

export default function OnboardingLayout({
  perfil,
  etapas,
  passo,
  titulo,
  subtitulo,
  aviso,
  statusFinal,
  onSkip,
  podePular = true,
  avisoObrigatorio = "Falta pouco para criar o seu perfil",
  erro = null,
  onTentarNovamente,
  onGoTo,
  resumo,
  resumoAtivo,
  onBack,
  onPrimary,
  primaryLabel,
  primaryIcon: PrimaryIcon = ArrowRight,
  primaryDisabled,
  ocupado = false,
  children,
}: OnboardingLayoutProps) {
  const total = etapas.length;
  const ultimoPasso = passo === total;
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const passoAnterior = useRef(passo);

  // Ao trocar de passo: volta pro topo e leva o foco pro título, pra quem
  // usa leitor de tela saber que o conteúdo mudou.
  useEffect(() => {
    if (passoAnterior.current === passo) return;
    passoAnterior.current = passo;
    window.scrollTo({ top: 0 });
    tituloRef.current?.focus({ preventScroll: true });
  }, [passo]);

  return (
    <div className="min-h-screen bg-white font-jakarta text-deepgreen">
      <div
        role="progressbar"
        aria-label="Progresso do onboarding"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={passo}
        aria-valuetext={`Passo ${passo} de ${total}`}
        className="h-1 w-full bg-lightgray"
      >
        <div
          className="h-full bg-deepgreen transition-[width] duration-500 ease-out"
          style={{ width: `${(passo / total) * 100}%` }}
        />
      </div>

      <header
        className={`border-b border-lightgray ${
          perfil === "investidor" ? "bg-[#F7F8F4]" : "bg-white"
        }`}
      >
        <div className={`${CONTAINER_LARGO} flex h-[68px] items-center justify-between gap-3 sm:h-[76px]`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo variant="verde" />
            <span className="whitespace-nowrap rounded-full border border-sage/50 bg-sage/25 px-2 py-1 text-[11px] font-semibold sm:px-2.5 sm:text-xs">
              {BADGE_PERFIL[perfil]}
            </span>
          </div>
          {!podePular ? (
            <span className="flex items-center gap-2 text-right text-xs font-medium sm:text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-deepgreen" aria-hidden="true" />
              {avisoObrigatorio}
            </span>
          ) : ultimoPasso ? (
            <span className="flex items-center gap-2 whitespace-nowrap text-xs font-medium sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-deepgreen" aria-hidden="true" />
              {statusFinal}
            </span>
          ) : (
            <button
              type="button"
              onClick={onSkip}
              disabled={ocupado}
              className={`whitespace-nowrap rounded-lg px-1 py-1 text-sm font-medium hover:underline sm:px-2 disabled:opacity-50 ${FOCO_VISIVEL}`}
            >
              Pular por enquanto
            </button>
          )}
        </div>
      </header>

      <main className={`${CONTAINER_CONTEUDO} pb-56 pt-8 sm:pb-36 md:pt-10`}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-sage/25 px-3 py-1.5 text-sm font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-deepgreen" aria-hidden="true" />
            Passo {passo} de {total}
          </span>
          <Stepper etapas={etapas} passo={passo} onGoTo={onGoTo} />
        </div>

        <h1
          ref={tituloRef}
          tabIndex={-1}
          className="mt-6 text-[28px] font-bold leading-tight tracking-tight focus:outline-none sm:text-[32px]"
        >
          {titulo}
        </h1>
        <p className="mt-2 max-w-[640px] text-base leading-relaxed text-deepgreen/75">
          {subtitulo}
        </p>

        <div className="mt-8 flex flex-col gap-5">
          {children}
          <div className="mt-2">
            <InfoNote>{aviso}</InfoNote>
          </div>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-lightgray bg-white/95 shadow-[0_-8px_24px_-16px_rgba(0,65,46,0.18)] backdrop-blur">
        {erro && (
          <div className={`${CONTAINER_LARGO} pt-3`}>
            <div
              role="alert"
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <CircleAlert size={18} className="shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1">{erro}</p>
              {onTentarNovamente && (
                <button
                  type="button"
                  onClick={onTentarNovamente}
                  disabled={ocupado}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold underline-offset-2 hover:underline disabled:opacity-50 ${FOCO_VISIVEL}`}
                >
                  <RotateCcw size={15} aria-hidden="true" />
                  Tentar novamente
                </button>
              )}
            </div>
          </div>
        )}
        <div className={`${CONTAINER_LARGO} grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-3 py-3 sm:flex sm:gap-3 sm:py-4`}>
          <button
            type="button"
            onClick={onBack}
            disabled={passo === 1 || ocupado}
            className={`row-start-2 inline-flex items-center gap-1.5 rounded-xl px-2 py-3 text-sm font-medium transition hover:bg-lightgray/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent sm:order-1 sm:gap-2 sm:px-3 ${FOCO_VISIVEL}`}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Voltar
          </button>

          <p
            aria-live="polite"
            className={`col-span-2 flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold sm:order-2 sm:ml-auto sm:text-sm ${
              resumoAtivo ? "bg-sage/30" : "bg-lightgray/70 text-deepgreen/80"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${resumoAtivo ? "bg-deepgreen" : "bg-deepgreen/50"}`}
              aria-hidden="true"
            />
            {resumo}
          </p>

          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled || ocupado}
            className={`row-start-2 inline-flex items-center justify-center gap-2 justify-self-end rounded-2xl bg-deepgreen px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-deepgreen/90 disabled:cursor-not-allowed disabled:opacity-40 sm:order-3 sm:px-7 sm:text-base ${FOCO_VISIVEL}`}
          >
            {primaryLabel}
            <PrimaryIcon size={18} className="shrink-0" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}

// Etapas em texto: concluídas com check (clicáveis pra voltar), a atual em
// negrito com ponto e as futuras em cinza. No mobile mostra só a atual.
function Stepper({
  etapas,
  passo,
  onGoTo,
}: {
  etapas: string[];
  passo: number;
  onGoTo: (passo: number) => void;
}) {
  return (
    <nav aria-label="Etapas do onboarding" className="min-w-0">
      <span className="text-sm font-semibold md:hidden">
        {passo}. {etapas[passo - 1]}
      </span>
      <ol className="hidden flex-wrap items-center gap-x-2 gap-y-1 text-sm md:flex">
        {etapas.map((etapa, indice) => {
          const numero = indice + 1;
          const rotulo = `${numero}. ${etapa}`;
          return (
            <li key={etapa} className="flex items-center gap-2">
              {indice > 0 && (
                <span className="h-1 w-1 rounded-full bg-deepgreen/30" aria-hidden="true" />
              )}
              {numero < passo ? (
                <button
                  type="button"
                  onClick={() => onGoTo(numero)}
                  className={`inline-flex items-center gap-1.5 rounded text-deepgreen/90 hover:underline ${FOCO_VISIVEL}`}
                >
                  <CircleCheck size={15} aria-hidden="true" />
                  <span className="sr-only">Concluída: </span>
                  {rotulo}
                </button>
              ) : numero === passo ? (
                <span aria-current="step" className="inline-flex items-center gap-1.5 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-deepgreen" aria-hidden="true" />
                  {rotulo}
                </span>
              ) : (
                <span className="text-deepgreen/70">{rotulo}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

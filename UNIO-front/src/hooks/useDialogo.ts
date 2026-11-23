import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";

const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focaveis(painel: HTMLElement) {
  return Array.from(painel.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS)).filter(
    (elemento) => elemento.offsetParent !== null || elemento === document.activeElement,
  );
}

// Comportamento comum de modal e drawer (role="dialog", aria-modal): foco
// inicial, Tab/Shift+Tab presos dentro do painel, ESC fecha, rolagem do fundo
// travada e, ao fechar, o foco volta ao elemento que abriu.
export function useDialogo(onFechar: () => void, refFocoInicial?: RefObject<HTMLElement | null>) {
  const refPainel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const painel = refPainel.current;
    const inicial = refFocoInicial?.current ?? (painel ? focaveis(painel)[0] : null) ?? painel;
    inicial?.focus();
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowAnterior;
      requestAnimationFrame(() => {
        // Se o elemento de origem saiu da tela, o foco vai para o título da página
        if (origem?.isConnected) origem.focus();
        else document.querySelector<HTMLElement>("main h1")?.focus();
      });
    };
    // Roda só na abertura: o objeto ref é estável
  }, [refFocoInicial]);

  function aoTeclar(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onFechar();
      return;
    }
    if (event.key !== "Tab" || !refPainel.current) return;
    const lista = focaveis(refPainel.current);
    if (lista.length === 0) return;
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    const ativo = document.activeElement;
    if (event.shiftKey && (ativo === primeiro || ativo === refPainel.current)) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && ativo === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  return { refPainel, aoTeclar };
}

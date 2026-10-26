import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { FOCO_VISIVEL } from "../../onboarding/selecao";

interface TeamDialogProps {
  title: string;
  description?: string;
  role?: "dialog" | "alertdialog";
  size?: "md" | "sm";
  busy?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function TeamDialog({
  title,
  description,
  role = "dialog",
  size = "md",
  busy = false,
  initialFocusRef,
  fallbackFocusRef,
  onClose,
  children,
}: TeamDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // The opener has focus when the dialog first renders
  const openerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  useEffect(() => {
    const first = initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const opener = openerRef.current;
    const fallback = fallbackFocusRef;
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
      else fallback?.current?.focus();
    };
  }, [initialFocusRef, fallbackFocusRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (!busy) onClose();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[45] flex items-end justify-center bg-deepgreen/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={handleKeyDown}
        className={`flex max-h-[94vh] w-full animate-fade-in flex-col overflow-hidden rounded-t-3xl bg-white font-jakarta text-deepgreen shadow-soft-lg sm:max-h-[90vh] sm:rounded-3xl ${
          size === "sm" ? "sm:max-w-[440px]" : "sm:max-w-[600px]"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-lightgray px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="break-words text-xl font-bold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-deepgreen/80">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
            className={`-mr-1 shrink-0 rounded-full p-2 hover:bg-lightgray disabled:cursor-not-allowed disabled:opacity-50 ${FOCO_VISIVEL}`}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

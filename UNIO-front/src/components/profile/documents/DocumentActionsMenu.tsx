import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { EllipsisVertical, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { FOCO_VISIVEL } from "../../onboarding/selecao";

interface DocumentActionsMenuProps {
  documentTitle: string;
  url: string | null;
  onEdit: () => void;
  onRemove: () => void;
}

const ITEM_CLASS =
  "flex min-h-[44px] w-full items-center gap-2 px-4 text-left text-sm font-medium hover:bg-lightgray focus:bg-lightgray focus:outline-none";

export default function DocumentActionsMenu({ documentTitle, url, onEdit, onRemove }: DocumentActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const focusOnOpen = useRef(0);
  const itemCount = url ? 3 : 2;

  useEffect(() => {
    if (!open) return;
    itemRefs.current[focusOnOpen.current]?.focus();
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function openMenu(index: number) {
    focusOnOpen.current = index;
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(itemCount - 1);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.slice(0, itemCount);
    const current = items.findIndex((item) => item === document.activeElement);
    let next: number;
    if (event.key === "ArrowDown") next = (current + 1) % itemCount;
    else if (event.key === "ArrowUp") next = (current - 1 + itemCount) % itemCount;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = itemCount - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    } else {
      if (event.key === "Tab") setOpen(false);
      return;
    }
    event.preventDefault();
    items[next]?.focus();
  }

  function select(action: () => void) {
    closeMenu();
    action();
  }

  function itemRef(index: number) {
    return (element: HTMLElement | null) => {
      itemRefs.current[index] = element;
    };
  }

  const offset = url ? 1 : 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Ações do documento ${documentTitle}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu(0))}
        onKeyDown={handleTriggerKeyDown}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-deepgreen hover:bg-lightgray ${FOCO_VISIVEL}`}
      >
        <EllipsisVertical size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Ações do documento ${documentTitle}`}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-2xl border border-lightgray bg-white py-1 shadow-soft-lg"
        >
          {url && (
            <a
              ref={itemRef(0)}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              tabIndex={-1}
              onClick={closeMenu}
              className={`${ITEM_CLASS} text-deepgreen`}
            >
              <ExternalLink size={16} aria-hidden="true" />
              Abrir
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
          <button
            ref={itemRef(offset)}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => select(onEdit)}
            className={`${ITEM_CLASS} text-deepgreen`}
          >
            <Pencil size={16} aria-hidden="true" />
            Editar
          </button>
          <button
            ref={itemRef(offset + 1)}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => select(onRemove)}
            className={`${ITEM_CLASS} text-red-700`}
          >
            <Trash2 size={16} aria-hidden="true" />
            Remover
          </button>
        </div>
      )}
    </div>
  );
}

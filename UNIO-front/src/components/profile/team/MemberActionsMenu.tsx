import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import { FOCO_VISIVEL } from "../../onboarding/selecao";

interface MemberActionsMenuProps {
  memberName: string;
  onEdit: () => void;
  onRemove: () => void;
}

const ITEMS = [
  { id: "edit", label: "Editar", icon: Pencil, tone: "text-deepgreen" },
  { id: "remove", label: "Remover", icon: Trash2, tone: "text-red-700" },
] as const;

export default function MemberActionsMenu({ memberName, onEdit, onRemove }: MemberActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusOnOpen = useRef(0);

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
      openMenu(ITEMS.length - 1);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((item) => item === document.activeElement);
    let next: number;
    if (event.key === "ArrowDown") next = (current + 1) % ITEMS.length;
    else if (event.key === "ArrowUp") next = (current - 1 + ITEMS.length) % ITEMS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = ITEMS.length - 1;
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
    itemRefs.current[next]?.focus();
  }

  function select(id: (typeof ITEMS)[number]["id"]) {
    closeMenu();
    if (id === "edit") onEdit();
    else onRemove();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Ações de ${memberName}`}
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
          aria-label={`Ações de ${memberName}`}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-2xl border border-lightgray bg-white py-1 shadow-soft-lg"
        >
          {ITEMS.map(({ id, label, icon: Icon, tone }, index) => (
            <button
              key={id}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => select(id)}
              className={`flex min-h-[44px] w-full items-center gap-2 px-4 text-left text-sm font-medium hover:bg-lightgray focus:bg-lightgray focus:outline-none ${tone}`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

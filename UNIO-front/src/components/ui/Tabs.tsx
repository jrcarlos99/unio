import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FOCO_VISIVEL } from "../onboarding/selecao";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  alert?: string;
}

interface TabsProps<T extends string> {
  label: string;
  idPrefix: string;
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  variant?: "underline" | "pill";
}

const LIST_CLASS = {
  underline: "flex gap-1 overflow-x-auto border-b border-lightgray",
  pill: "flex gap-2 overflow-x-auto p-1",
};

const TAB_CLASS = {
  underline: {
    base: "-mb-px inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 text-sm transition-colors",
    selected: "border-deepgreen font-semibold text-deepgreen",
    idle: "border-transparent text-deepgreen/75 hover:border-sage hover:text-deepgreen",
  },
  pill: {
    base: "inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-full px-5 text-sm transition-colors",
    selected: "bg-deepgreen font-semibold text-white",
    idle: "text-deepgreen/75 hover:bg-lightgray hover:text-deepgreen",
  },
};

function tabDomId(prefix: string, tab: string) {
  return `${prefix}-tab-${tab}`;
}

function panelDomId(prefix: string, tab: string) {
  return `${prefix}-panel-${tab}`;
}

export default function Tabs<T extends string>({ label, idPrefix, tabs, activeTab, variant = "underline", onChange }: TabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = tabs.findIndex((tab) => tab.id === activeTab);
    let next: number;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;

    event.preventDefault();
    onChange(tabs[next].id);
    tabRefs.current[next]?.focus();
  }

  const tabStyle = TAB_CLASS[variant];

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={LIST_CLASS[variant]}
    >
      {tabs.map(({ id, label: tabLabel, icon: Icon, alert }, index) => {
        const selected = id === activeTab;
        return (
          <button
            key={id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabDomId(idPrefix, id)}
            aria-selected={selected}
            aria-controls={panelDomId(idPrefix, id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            className={`${tabStyle.base} ${FOCO_VISIVEL} ${selected ? tabStyle.selected : tabStyle.idle}`}
          >
            {Icon && <Icon size={18} aria-hidden="true" />}
            {tabLabel}
            {alert && (
              <>
                <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
                <span className="sr-only">({alert})</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps<T extends string> {
  idPrefix: string;
  tab: T;
  activeTab: T;
  className?: string;
  children: ReactNode;
}

// Panel of one tab. Stays mounted while hidden, so its fields keep their
// DOM ids (used to focus the first invalid field).
export function TabPanel<T extends string>({ idPrefix, tab, activeTab, className = "", children }: TabPanelProps<T>) {
  return (
    <div
      role="tabpanel"
      id={panelDomId(idPrefix, tab)}
      aria-labelledby={tabDomId(idPrefix, tab)}
      hidden={tab !== activeTab}
      className={className}
    >
      {children}
    </div>
  );
}

import { NavLink } from "react-router-dom";
import { CalendarDays, LayoutGrid, LogOut, MessageSquare, Rocket, Users, X } from "lucide-react";
import { useAuth, type UserProfile } from "../../contexts/AuthContext";
import { getInitials } from "./utils/format";

interface StartupSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS = [
  { to: "/home-startup", label: "Visão Geral", icon: LayoutGrid, end: true },
  { to: "/home-startup/investidores", label: "Investidores", icon: Users, end: false },
  { to: "/home-startup/mensagens", label: "Mensagens", icon: MessageSquare, end: false },
  { to: "/home-startup/reunioes", label: "Reuniões", icon: CalendarDays, end: false },
  { to: "/home-startup/perfil", label: "Perfil e Pitch", icon: Rocket, end: false },
];

function getDisplayName(user: UserProfile | null): string {
  if (!user) return "";
  for (const value of [user.nomeStartup, user.name, user.nome, user.email]) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export default function StartupSidebar({ isOpen, onClose }: StartupSidebarProps) {
  const { user, logout } = useAuth();
  const displayName = getDisplayName(user);

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />}

     <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col bg-deepgreen text-white transition-transform duration-300 ease-in-out md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:w-64 md:translate-x-0 md:rounded-3xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <span className="text-lg font-bold tracking-wide">UNIO Startup</span>
          <button type="button" onClick={onClose} aria-label="Fechar menu" className="md:hidden">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="px-6 pb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
          Navegação
        </p>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-sage text-deepgreen" : "text-white/80 hover:bg-sage/30"
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4">
          <div className="flex items-center gap-3 rounded-xl bg-sage px-3 py-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-deepgreen"
            >
              {getInitials(displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-deepgreen">{displayName}</p>
              <p className="truncate text-xs text-deepgreen/70">Conta Startup</p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-sage/30"
          >
            <LogOut size={18} aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

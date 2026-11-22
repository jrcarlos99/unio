import { NavLink } from "react-router-dom";
import { LayoutGrid, UserCheck, FileWarning, History, LogOut, X } from "lucide-react";
import Logo from "../../components/brand/Logo";
import { useAuth } from "../../contexts/AuthContext";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Um item por sub-rota do admin. `end: true` no primeiro evita que "/admin"
// fique marcado como ativo quando na verdade estamos em "/admin/cadastros".
const ITENS = [
  { to: "/admin", label: "Visão Geral", icon: LayoutGrid, end: true },
  { to: "/admin/cadastros", label: "Cadastros", icon: UserCheck, end: false },
  { to: "/admin/conteudo", label: "Moderação de Conteúdo", icon: FileWarning, end: false },
  { to: "/admin/auditoria", label: "Log de Auditoria", icon: History, end: false },
];

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  // Conta logada de verdade (token do back), não um perfil fictício
  const { user, logout } = useAuth();
  const email = user?.email ?? "";
  const inicial = email.charAt(0).toUpperCase() || "A";

  return (
    <>
      {/* No mobile, um fundo escurecido atrás do menu aberto — clicar nele fecha o menu */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />
      )}

      {/* No mobile a sidebar é uma gaveta que cobre a tela inteira (edge-to-edge).
          No desktop (md:) ela vira um painel "flutuante": com margem, cantos
          arredondados e sticky, sempre visível ao rolar o conteúdo. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col bg-deepgreen text-white transition-transform duration-300 ease-in-out md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:w-64 md:translate-x-0 md:rounded-3xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <span className="flex items-center gap-2">
            <Logo variant="branca" />
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white/90">ADMIN</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <p className="px-6 pb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
          Navegação
        </p>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {ITENS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  // sage é um verde claro/médio — sobre ele o texto deepgreen
                  // é o que garante contraste de verdade, não white.
                  isActive ? "bg-sage text-deepgreen" : "text-white/80 hover:bg-sage/30"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé: conta logada + sair (apaga o token e volta ao login) */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-3 rounded-xl bg-sage px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-deepgreen">
              {inicial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-deepgreen">{email}</p>
              <p className="truncate text-xs text-deepgreen/70">Administrador da plataforma</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-sage/30"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

import { useId, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronsUpDown, LogOut, SlidersHorizontal, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSolicitacoesRecebidas } from "../../hooks/useReunioes";
import { iniciais, nomeUsuario } from "../../utils/nomeUsuario";
import Logo from "../brand/Logo";
import { CONFIG_PERFIL, type PerfilApp } from "./navegacao";

interface AppSidebarProps {
  perfil: PerfilApp;
  aberta: boolean;
  onFechar: () => void;
}

const FOCO_ESCURO =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-deepgreen";

const PILULA = "rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white/90";

// O perfil ainda não tem campo de cargo/tipo no back; usa o que vier
function cargo(valor: unknown, padrao: string) {
  return typeof valor === "string" && valor.trim() ? valor : padrao;
}

// Sidebar das áreas logadas (investidor e startup): fixa de 260px no desktop,
// drawer abaixo de lg. Itens, selo e textos vêm de navegacao.ts.
export default function AppSidebar({ perfil, aberta, onFechar }: AppSidebarProps) {
  const config = CONFIG_PERFIL[perfil];
  const { user, logout } = useAuth();
  const nome = nomeUsuario(user);
  const [menuAberto, setMenuAberto] = useState(false);
  const idMenu = useId();
  const solicitacoes = useSolicitacoesRecebidas();

  return (
    <>
      {aberta && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onFechar} aria-hidden="true" />
      )}

      <aside
        aria-label={`Menu ${perfil === "startup" ? "da startup" : "do investidor"}`}
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-deepgreen text-white transition-transform duration-300 ease-in-out lg:w-[260px] lg:translate-x-0 ${
          aberta ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-2 px-6 pb-6 pt-7">
          <Link to={config.home} onClick={onFechar} className={`flex items-center rounded-xl ${FOCO_ESCURO}`}>
            <span className="flex items-center gap-3">
              <Logo variant="branca" />
              <span className={PILULA}>{config.selo}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar menu"
            className={`-mr-2 rounded-lg p-1 lg:hidden ${FOCO_ESCURO}`}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-4">
          {config.itens.map(({ to, rotulo, icone: Icone, contador }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onFechar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition-colors ${FOCO_ESCURO} ${
                  isActive ? "bg-white/15 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icone size={18} aria-hidden="true" />
              {rotulo}
              {contador === "solicitacoesReuniao" && solicitacoes > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sage px-1.5 text-xs font-bold text-deepgreen">
                  {solicitacoes}
                  <span className="sr-only">
                    {solicitacoes === 1 ? " solicitação pendente" : " solicitações pendentes"}
                  </span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div
          className="relative border-t border-white/10 px-4 py-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") setMenuAberto(false);
          }}
        >
          {menuAberto && (
            <div
              id={idMenu}
              className="absolute inset-x-4 bottom-full mb-2 overflow-hidden rounded-2xl bg-white py-1 text-sm text-deepgreen shadow-soft-lg"
            >
              <Link
                to={config.revisar.to}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-lightgray/60 focus-visible:bg-lightgray/60 focus-visible:outline-none"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                {config.revisar.rotulo}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-lightgray/60 focus-visible:bg-lightgray/60 focus-visible:outline-none"
              >
                <LogOut size={16} aria-hidden="true" />
                Sair
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuAberto((atual) => !atual)}
            aria-expanded={menuAberto}
            aria-controls={idMenu}
            className={`flex w-full items-center gap-3 rounded-2xl bg-white/5 px-3 py-3 text-left transition hover:bg-white/10 ${FOCO_ESCURO}`}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-bold text-deepgreen ring-2 ring-white/20"
              aria-hidden="true"
            >
              {iniciais(nome)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{nome}</span>
              <span className="block truncate text-xs text-white/75">
                {cargo(perfil === "startup" ? user?.cargo : user?.tipoPerfil, config.cargoPadrao)}
              </span>
            </span>
            <ChevronsUpDown size={16} className="shrink-0 text-white/75" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  );
}

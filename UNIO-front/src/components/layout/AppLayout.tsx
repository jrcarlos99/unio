import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import Logo from "../brand/Logo";
import AppSidebar from "./AppSidebar";
import { CONFIG_PERFIL, perfilDoPapel } from "./navegacao";
import ToastProvider from "./ToastProvider";

// Shell de todas as telas logadas do investidor e da startup: sidebar fixa de
// 260px no desktop e drawer com hambúrguer abaixo de lg. O perfil vem do
// usuário logado.
export default function AppLayout() {
  const { user } = useAuth();
  const perfil = perfilDoPapel(user?.role);
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <ToastProvider>
      <div
        className="min-h-screen bg-lightgray/20 font-jakarta text-deepgreen"
        onKeyDown={(event) => {
          if (event.key === "Escape") setMenuAberto(false);
        }}
      >
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-xl bg-white px-4 py-2 font-semibold text-deepgreen shadow-soft focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Pular para o conteúdo
        </a>

        <AppSidebar perfil={perfil} aberta={menuAberto} onFechar={() => setMenuAberto(false)} />

        <div className="lg:pl-[260px]">
          <header className="sticky top-0 z-20 flex items-center gap-3 bg-deepgreen px-4 py-3 text-white lg:hidden">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
              aria-expanded={menuAberto}
              className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <Logo variant="branca" size="sm" />
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white/90">
              {CONFIG_PERFIL[perfil].selo}
            </span>
          </header>

          {/* Largura fluida até 1600px (1760px no 2xl). Cada tela limita o que
              não deve esticar: textos com max-w-2xl, formulários e leitura com
              max-w-6xl, listas de cards com mais colunas. */}
          <main
            id="conteudo"
            className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10 2xl:max-w-[1760px]"
          >
            <Suspense fallback={<p className="text-deepgreen">Carregando...</p>}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

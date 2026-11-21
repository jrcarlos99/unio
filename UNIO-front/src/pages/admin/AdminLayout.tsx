import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import Logo from "../../components/brand/Logo";

// Layout compartilhado de toda a área /admin: sidebar + conteúdo da
// sub-rota atual (via <Outlet />), no estilo "painéis flutuantes" — o
// fundo da página é white e tanto a sidebar quanto o card de conteúdo
// têm seus próprios cantos arredondados e sombra, como se estivessem
// "boiando" sobre esse fundo.
export default function AdminLayout() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
      <div className="min-h-screen bg-white p-4 md:flex md:items-start md:gap-4 lg:gap-6">
        <AdminSidebar isOpen={menuAberto} onClose={() => setMenuAberto(false)} />

        <div className="min-w-0 flex-1">
          {/* Essa barra só aparece no mobile — é o jeito de abrir a sidebar */}
          <header className="mb-4 flex items-center gap-3 rounded-2xl bg-deepgreen px-4 py-3 text-white md:hidden">
            <button type="button" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
              <Menu size={20} />
            </button>
            <Logo variant="branca" size="sm" />
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white/90">ADMIN</span>
          </header>

          <main className="rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
  );
}

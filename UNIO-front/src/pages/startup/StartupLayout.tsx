import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import StartupSidebar from "./StartupSidebar";

export default function StartupLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white p-4 md:flex md:items-start md:gap-4 lg:gap-6">
      <StartupSidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="min-w-0 flex-1">
        <header className="mb-4 flex items-center gap-3 rounded-2xl bg-deepgreen px-4 py-3 text-white md:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={20} aria-hidden="true" />
          </button>
          <span className="text-lg font-bold tracking-wide">UNIO Startup</span>
        </header>

        <main className="rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <Suspense fallback={<div className="text-deepgreen">Carregando...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

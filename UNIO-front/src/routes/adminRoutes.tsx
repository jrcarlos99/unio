import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";

// Cada tela do admin só é baixada quando alguém de fato entra em /admin
// (code-splitting) — por isso o import lazy em vez do import normal. O
// layout é o mesmo AppLayout das outras áreas (ADR-014); a proteção por
// perfil ADMIN fica em routes/index.tsx.
const AppLayout = lazy(() => import("../components/layout/AppLayout"));
const VisaoGeral = lazy(() => import("../pages/admin/pages/VisaoGeral"));
const ModeracaoCadastros = lazy(
  () => import("../pages/admin/pages/ModeracaoCadastros"),
);
const ModeracaoConteudo = lazy(
  () => import("../pages/admin/pages/ModeracaoConteudo"),
);
const LogAuditoria = lazy(() => import("../pages/admin/pages/LogAuditoria"));

// Rotas do painel administrativo, aninhadas sob /admin (mesma ideia do
// publicRoutes.tsx: precisa ser um Fragment pronto, não um componente).
const adminRoutes = (
  <>
    <Route
      path="/admin"
      element={
        <Suspense
          fallback={<div className="p-8 text-deepgreen">Carregando...</div>}
        >
          <AppLayout />
        </Suspense>
      }
    >
      <Route index element={<VisaoGeral />} />
      <Route path="cadastros" element={<ModeracaoCadastros />} />
      <Route path="conteudo" element={<ModeracaoConteudo />} />
      <Route path="auditoria" element={<LogAuditoria />} />
    </Route>
  </>
);

export default adminRoutes;

import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";

const StartupLayout = lazy(() => import("../pages/startup/StartupLayout"));
const StartupOverview = lazy(() => import("../pages/startup/pages/StartupOverview"));
const ComingSoon = lazy(() => import("../pages/startup/pages/ComingSoon"));


const startupRoutes = (
  <>
    <Route
      path="/home-startup"
      element={
        <Suspense fallback={<div className="p-8 text-deepgreen">Carregando...</div>}>
          <StartupLayout />
        </Suspense>
      }
    >
      <Route index element={<StartupOverview />} />
      <Route path="investidores" element={<ComingSoon title="Investidores" />} />
      <Route path="mensagens" element={<ComingSoon title="Mensagens" />} />
      <Route path="reunioes" element={<ComingSoon title="Reuniões" />} />
      <Route path="perfil" element={<ComingSoon title="Perfil e Pitch" />} />
    </Route>
  </>
);

export default startupRoutes;
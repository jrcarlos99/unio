import { lazy } from "react";
import { Route } from "react-router-dom";
import PorPerfil from "./PorPerfil";

const PaginaSalvos = lazy(() => import("../pages/shared/PaginaSalvos"));
const PaginaMeusUnios = lazy(() => import("../pages/shared/PaginaMeusUnios"));
const PaginaReunioes = lazy(() => import("../pages/shared/PaginaReunioes"));
const StartupProfile = lazy(() => import("../pages/startup/StartupProfile"));
const InvestorProfile = lazy(() => import("../pages/investidor/InvestorProfile"));

const compartilhadasRoutes = (
  <>
    <Route
      path="/salvos"
      element={<PorPerfil investidor={<PaginaSalvos perfil="investidor" />} startup={<PaginaSalvos perfil="startup" />} />}
    />
    <Route
      path="/meus-unios"
      element={
        <PorPerfil investidor={<PaginaMeusUnios perfil="investidor" />} startup={<PaginaMeusUnios perfil="startup" />} />
      }
    />
    <Route
      path="/reunioes"
      element={
        <PorPerfil investidor={<PaginaReunioes perfil="investidor" />} startup={<PaginaReunioes perfil="startup" />} />
      }
    />
     <Route
      path="/meu-perfil"
      element={
        <PorPerfil investidor={<InvestorProfile />} startup={<StartupProfile />} />
      }
    />
  </>
);

export default compartilhadasRoutes;
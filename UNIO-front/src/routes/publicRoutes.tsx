import { Navigate, Route } from "react-router-dom";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import AccessDenied from "../pages/AccessDenied";

// Rotas públicas: landing, login/cadastro e as páginas iniciais de cada tipo
// de conta. Isso já é um elemento <Route>/Fragment pronto (não uma função
// componente) porque o <Routes> em routes/index.tsx só sabe "olhar para
// dentro" de um Fragment — se isso fosse renderizado como <PublicRoutes />,
// o React Router não enxergaria as rotas lá dentro.
const publicRoutes = (
  <>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    {/* Endereços antigos do cadastro (docs/adr/ADR-001): o perfil agora é
        criado no onboarding, e o registro da conta fica no /login */}
    <Route path="/cadastro" element={<Navigate to="/login?modo=cadastro" replace />} />
    <Route path="/cadastro-startup" element={<Navigate to="/onboarding/startup" replace />} />
    <Route path="/cadastro-investidor" element={<Navigate to="/onboarding/investidor" replace />} />
    <Route path="/acesso-negado" element={<AccessDenied />} />
    {/* /home-startup e /home-investidor ficam em startupRoutes.tsx e investidorRoutes.tsx */}
  </>
);

export default publicRoutes;

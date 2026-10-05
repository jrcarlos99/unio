import { Routes, Route, Navigate } from "react-router-dom";
import publicRoutes from "./publicRoutes";
import adminRoutes from "./adminRoutes";
import startupRoutes from "./startupRoutes";
import ProtectedRoute from "./ProtectedRoute";

// Componente único de rotas da aplicação — App.tsx só renderiza isso dentro
// do BrowserRouter. Junta as rotas públicas e as do admin (cada uma em seu
// próprio arquivo) e adiciona o catch-all: qualquer caminho desconhecido
// volta pra home.
export default function AppRoutes() {
  return (
    <Routes>
      {publicRoutes}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        {adminRoutes}
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["startup"]} />}>
        {startupRoutes}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

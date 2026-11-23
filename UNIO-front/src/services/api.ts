import axios from "axios";

export const TOKEN_KEY = "unio_token";

// Endereço do back (ADR-011). Única fonte: VITE_API_URL, lida no build do
// Vite. Sem ela, o padrão é o back de produção no Azure: um build publicado
// sem a variável continua falando com o back certo, em vez de procurar um
// localhost que não existe na máquina de quem acessa. Para desenvolver com o
// back local, defina VITE_API_URL=http://localhost:8080 no .env.
export const API_URL_PADRAO = "https://unio-webapp-ghbmd2a6a4fmc4cb.brazilsouth-01.azurewebsites.net";

// Sem barra no final: as rotas dos serviços já começam com "/api/..."
export function resolverApiUrl(valor: unknown): string {
  const url = typeof valor === "string" ? valor.trim() : "";
  return (url || API_URL_PADRAO).replace(/\/+$/, "");
}

// import.meta.env só existe no Vite; nos testes do node fica indefinido
export const API_URL = resolverApiUrl(import.meta.env?.VITE_API_URL);

// Página em https chamando o back em http: o navegador bloqueia (mixed
// content) e o app parece "não conectar". Avisa no console de quem publicou.
if (typeof window !== "undefined" && window.location?.protocol === "https:" && API_URL.startsWith("http://")) {
  console.error(`VITE_API_URL usa http:// (${API_URL}) numa página https: o navegador vai bloquear as chamadas.`);
}

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  // Sem limite, uma requisição pendurada deixava o botão em "CADASTRANDO..."
  // pra sempre. Passado esse tempo, a tela recebe um erro e libera o botão.
  timeout: 120000,
});

// Lê o "exp" (segundos) do JWT. Não valida a assinatura (papel do back): só
// evita mandar um token que já venceu.
export function tokenExpirado(token: string, agoraMs = Date.now()): boolean {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof claims.exp === "number" && claims.exp * 1000 <= agoraMs;
  } catch {
    return true;
  }
}

// Rotas de entrada: um 401 delas é "credenciais inválidas", não sessão vencida
const ROTAS_SEM_SESSAO = ["/api/auth/"];

function ehRotaSemSessao(url: string | undefined) {
  return !!url && ROTAS_SEM_SESSAO.some((rota) => url.includes(rota));
}

// Sessão vencida ou recusada pelo back: apaga o token e volta ao login,
// guardando o motivo para a tela de login avisar
export function encerrarSessaoExpirada() {
  localStorage.removeItem(TOKEN_KEY);
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login?sessao=expirada");
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !ehRotaSemSessao(config.url)) {
    if (tokenExpirado(token)) {
      encerrarSessaoExpirada();
      return Promise.reject(new axios.CanceledError("Sessão expirada"));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !ehRotaSemSessao(error.config?.url)) {
      encerrarSessaoExpirada();
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isCancel(error)) return "Sua sessão expirou. Entre novamente.";
  if (axios.isAxiosError(error)) {
    // Sem resposta nenhuma: servidor fora do ar, sem rede ou tempo esgotado
    if (!error.response) {
      return error.code === "ECONNABORTED"
        ? "O servidor demorou demais para responder. Tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
    }
    const data = error.response.data;
    // Erros de validação do Spring vêm com um "message" genérico ("Validation
    // failed for object=...") e o texto útil em errors[].defaultMessage, por
    // isso os erros por campo têm prioridade.
    if (data && Array.isArray(data.errors)) {
      const porCampo = data.errors
        .map((item: unknown) => {
          if (item && typeof item === "object" && "defaultMessage" in item) {
            return String(item.defaultMessage);
          }
          return "";
        })
        .filter(Boolean)
        .join(" ");
      if (porCampo) return porCampo;
    }
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data.message === "string" && data.message.trim()) return data.message;
    if (data && typeof data.detail === "string") return data.detail;
    if (data && typeof data.errors === "object" && data.errors !== null) {
      const textos = Object.values(data.errors as Record<string, unknown>)
        .filter((value): value is string => typeof value === "string")
        .join(" ");
      if (textos) return textos;
    }
    // Sem texto do back: mensagem pelo status. No login, 401 é senha ou e-mail
    // errado. O back unificado responde "Credenciais inválidas" no JSON padrão
    // (D062 do back, ADR-012); se vier sem corpo (versão antiga), vale a mensagem da tela.
    if (error.response.status === 401) {
      return ehRotaSemSessao(error.config?.url) ? fallback : "Sua sessão expirou. Entre novamente.";
    }
    if (error.response.status === 403) return "Você não tem permissão para esta ação.";
  }
  return fallback;
}

export default api;

import axios from "axios";

export const TOKEN_KEY = "unio_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  // Sem limite, uma requisição pendurada deixava o botão em "CADASTRANDO..."
  // pra sempre. Passado esse tempo, a tela recebe um erro e libera o botão.
  timeout: 20000,
});

// VITE_MOCK_BACKEND=true no .env desconecta o front do back: as requisições
// passam a ser respondidas por services/mockBackend.ts (carregado só nesse
// caso). Pra voltar a usar o back de verdade, remova a variável e reinicie
// o npm run dev. Serviços que têm mock próprio (ex.: reunioesService) leem
// esta mesma constante para escolher o modo.
export const MOCK_BACKEND = import.meta.env.VITE_MOCK_BACKEND === "true";

if (MOCK_BACKEND) {
  const mock = import("./mockBackend");
  api.defaults.adapter = async (config) => (await mock).mockAdapter(config);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    // Sem resposta nenhuma: servidor fora do ar, sem rede ou tempo esgotado
    if (!error.response) {
      return error.code === "ECONNABORTED"
        ? "O servidor demorou demais para responder. Tente novamente."
        : "Não foi possível conectar ao servidor. Verifique se o back-end está rodando.";
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
    if (data && typeof data.message === "string") return data.message;
    if (data && typeof data.detail === "string") return data.detail;
    if (data && typeof data.errors === "object" && data.errors !== null) {
      return Object.values(data.errors as Record<string, unknown>)
        .filter((value): value is string => typeof value === "string")
        .join(" ");
    }
  }
  return fallback;
}

export default api;

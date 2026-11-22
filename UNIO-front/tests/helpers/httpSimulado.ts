// Simula só a camada HTTP: troca o adapter do axios por uma tabela de
// respostas no formato do back. Nada de dados de exemplo em src/ (ADR-011).
import axios, { AxiosError, AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

export interface Chamada {
  metodo: string;
  url: string;
  // URL completa (baseURL + url), para conferir o endereço do back
  urlCompleta: string;
  corpo: unknown;
  autorizacao: string | undefined;
}

type Resposta = { status: number; data: unknown };
type Rota = (config: InternalAxiosRequestConfig) => Resposta;

// Navegador mínimo para o api.ts: localStorage e window.location
export function prepararNavegador(pathname = "/home-startup") {
  const dados = new Map<string, string>();
  const destinos: string[] = [];
  Object.assign(globalThis, {
    localStorage: {
      getItem: (chave: string) => dados.get(chave) ?? null,
      setItem: (chave: string, valor: string) => void dados.set(chave, String(valor)),
      removeItem: (chave: string) => void dados.delete(chave),
      clear: () => dados.clear(),
    },
    window: { location: { pathname, protocol: "https:", assign: (url: string) => void destinos.push(url) } },
  });
  return { dados, destinos };
}

// JWT sem assinatura válida (o front não valida assinatura, só lê o exp)
export function tokenFalso(expEmSegundos: number) {
  const parte = (objeto: object) => Buffer.from(JSON.stringify(objeto)).toString("base64url");
  return `${parte({ alg: "HS256" })}.${parte({ sub: "e2e@unio.test", role: "STARTUP", userId: 7, exp: expEmSegundos })}.assinatura`;
}

export function simularBack(api: AxiosInstance, rotas: Record<string, Rota | Resposta>) {
  const chamadas: Chamada[] = [];
  api.defaults.adapter = async (config) => {
    const metodo = (config.method ?? "get").toUpperCase();
    const url = config.url ?? "";
    const headers = AxiosHeaders.from(config.headers);
    chamadas.push({
      metodo,
      url,
      urlCompleta: `${config.baseURL ?? ""}${url}`,
      corpo: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
      autorizacao: headers.get("Authorization") as string | undefined,
    });
    const rota = rotas[`${metodo} ${url}`];
    const resposta = typeof rota === "function" ? rota(config) : (rota ?? { status: 404, data: { message: "Não encontrado" } });
    const completa = { ...resposta, statusText: "", headers: {}, config, request: {} };
    if (resposta.status >= 400) {
      throw new AxiosError(`HTTP ${resposta.status}`, "ERR_BAD_RESPONSE", config, {}, completa);
    }
    return completa;
  };
  return chamadas;
}

export { axios };

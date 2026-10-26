import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { ADMIN_EMAIL, ADMIN_SENHA } from "../data/store";

const CHAVE_BANCO = "unio_mock_backend";
const LATENCIA_MS = 300;

type Role = "STARTUP" | "INVESTOR" | "ADMIN";

interface UsuarioMock {
  id: number;
  email: string;
  senha: string;
  role: Role;
  createdAt: string;
}

type PitchStatusMock = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "REJECTED";

// Same shape the front assumes in types/pitch.ts (StartupPitchResponse)
interface PitchMock {
  status: PitchStatusMock;
  shortPitch: string;
  videoUrl: string | null;
  updatedAt: string;
  leanCanvas: Record<string, string>;
}

type OnboardingStatusMock = "PENDENTE" | "CONCLUIDO" | "PULADO";


interface OnboardingMock {
  status: OnboardingStatusMock;
  respostas: Record<string, unknown>;
  atualizadoEm: string | null;
}

interface BancoMock {
  proximoId: number;
  usuarios: UsuarioMock[];
  // perfis por id do usuário
  startups: Record<number, Record<string, unknown>>;
  investidores: Record<number, Record<string, unknown>>;
  pitches?: Record<number, PitchMock>;
  onboarding?: Record<number, OnboardingMock>;
}

function bancoInicial(): BancoMock {
  return {
    proximoId: 2,
    // Mesmo admin de demonstração de data/store.ts
    usuarios: [
      {
        id: 1,
        email: ADMIN_EMAIL,
        senha: ADMIN_SENHA,
        role: "ADMIN",
        createdAt: new Date().toISOString(),
      },
    ],
    startups: {},
    investidores: {},
  };
}

function lerBanco(): BancoMock {
  try {
    const bruto = localStorage.getItem(CHAVE_BANCO);
    if (bruto) return JSON.parse(bruto) as BancoMock;
  } catch {
    // banco corrompido ou localStorage indisponível: recomeça do zero
  }
  return bancoInicial();
}

function salvarBanco(banco: BancoMock) {
  try {
    localStorage.setItem(CHAVE_BANCO, JSON.stringify(banco));
  } catch {
    // sem localStorage os dados só duram até recarregar a página
  }
}

// Token no formato JWT (header.payload.assinatura) com as mesmas claims do
// back (sub, userId, role), pra o AuthContext conseguir ler. Sem assinatura
// de verdade — não serve pra nada fora deste simulador.
function base64Url(texto: string) {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  bytes.forEach((byte) => (binario += String.fromCharCode(byte)));
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function gerarToken(usuario: UsuarioMock) {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ sub: usuario.email, userId: usuario.id, role: usuario.role }),
  );
  return `${header}.${payload}.mock`;
}

function usuarioDoToken(banco: BancoMock, config: InternalAxiosRequestConfig) {
  const auth = String(config.headers?.Authorization ?? "");
  const token = auth.replace(/^Bearer\s+/i, "");
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as { userId?: number };
    return banco.usuarios.find((usuario) => usuario.id === claims.userId) ?? null;
  } catch {
    return null;
  }
}

class ErroHttp extends Error {
  status: number;
  extra?: Record<string, unknown>;
  constructor(status: number, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function resumoUsuario(usuario: UsuarioMock) {
  return {
    id: usuario.id,
    email: usuario.email,
    role: usuario.role,
    createdAt: usuario.createdAt,
  };
}

const STARTUP_FIELDS = [
  "nome",
  "segmento",
  "estagio",
  "localizacao",
  "modeloNegocio",
  "mercadoAlvo",
  "capitalProcurado",
  "pitchCanvas",
];

const INVESTOR_FIELDS = [
  "segmentosInteresse",
  "estagiosInteresse",
  "ticketMinimo",
  "ticketMaximo",
  "regiaoInteresse",
  "perfilRisco",
  "disponibilidade",
  "disponibilidadeObservacao",
];
const DISPONIBILIDADES_MENTORIA = ["BAIXA", "MEDIA", "ALTA"];

function atualizarInvestidor(perfil: Record<string, unknown>, corpo: Record<string, unknown>) {
  for (const campo of INVESTOR_FIELDS) {
    if (!(campo in corpo)) continue;
    const valor = corpo[campo];
    if (campo === "disponibilidade") {
      // null clears it; any other value must match the enum exactly
      if (valor != null && !DISPONIBILIDADES_MENTORIA.includes(String(valor))) {
        throw new ErroHttp(400, "Disponibilidade de mentoria inválida");
      }
      perfil[campo] = valor == null ? null : String(valor);
    } else if (campo === "disponibilidadeObservacao") {
      if (valor != null && String(valor).length > 255) {
        throw new ErroHttp(400, "disponibilidadeObservacao deve ter no máximo 255 caracteres");
      }
      perfil[campo] = valor == null ? null : String(valor);
    } else if (campo === "ticketMinimo" || campo === "ticketMaximo") {
      perfil[campo] = valor == null ? null : Number(valor);
    } else if (campo === "segmentosInteresse" || campo === "estagiosInteresse") {
      perfil[campo] = Array.isArray(valor) ? valor.map((item) => String(item).trim()).filter(Boolean) : [];
    } else {
      perfil[campo] = String(valor);
    }
  }
}

function perfilCompleto(banco: BancoMock, usuario: UsuarioMock) {
  if (usuario.role === "ADMIN") return resumoUsuario(usuario);
  const perfil =
    usuario.role === "STARTUP" ? banco.startups[usuario.id] : banco.investidores[usuario.id];
  if (!perfil) {
    const tipo = usuario.role === "STARTUP" ? "Startup" : "Investor";
    throw new ErroHttp(404, `Perfil ${tipo} não encontrado`);
  }
  if (usuario.role === "STARTUP") {
    const campos = Object.fromEntries(STARTUP_FIELDS.map((campo) => [campo, perfil[campo] ?? null]));
    return { ...resumoUsuario(usuario), ...campos };
  }
   return { ...resumoUsuario(usuario), disponibilidade: null, disponibilidadeObservacao: null, ...perfil };
}

function atualizarStartup(perfil: Record<string, unknown>, corpo: Record<string, unknown>) {
  if ("nome" in corpo && corpo.nome != null && String(corpo.nome).length > 255) {
    throw new ErroHttp(400, "nome deve ter no máximo 255 caracteres");
  }
  for (const campo of STARTUP_FIELDS) {
    if (!(campo in corpo)) continue;
    const valor = corpo[campo];
    if (campo === "capitalProcurado") perfil[campo] = valor == null ? null : Number(valor);
    else if (campo === "nome") perfil[campo] = valor == null ? null : String(valor);
    else perfil[campo] = String(valor);
  }
}

function exigirCampos(corpo: Record<string, unknown>, campos: Record<string, string>) {
  const faltando = Object.entries(campos)
    .filter(([campo]) => {
      const valor = corpo[campo];
      return valor === undefined || valor === null || String(valor).trim() === "";
    })
    .map(([, mensagem]) => ({ defaultMessage: mensagem }));
  if (faltando.length > 0) throw new ErroHttp(400, "Dados inválidos", { errors: faltando });
}

function exigirPositivo(valor: unknown, mensagem: string) {
  if (!(Number(valor) > 0)) {
    throw new ErroHttp(400, mensagem, { errors: [{ defaultMessage: mensagem }] });
  }
}

const SHORT_PITCH_MAX = 280;
const CANVAS_BLOCK_MAX = 500;
const CANVAS_FIELDS = [
  "problem",
  "customerSegments",
  "uniqueValueProposition",
  "solution",
  "channels",
  "revenueStreams",
  "costStructure",
  "keyMetrics",
  "unfairAdvantage",
];

// Sample pitch given to a startup on its first GET, already published
function samplePitch(): PitchMock {
  return {
    status: "PUBLISHED",
    shortPitch:
      "Sensores IoT e IA que reduzem em até 40% o consumo de água na irrigação de pequenos e médios produtores do Nordeste, com payback em menos de 6 meses.",
    // Valid YouTube format, but a placeholder id (no real video behind it)
    videoUrl: "https://www.youtube.com/watch?v=EXEMPLO0001",
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    leanCanvas: {
      problem:
        "Irrigação feita no olho: até metade da água é desperdiçada. Conta de energia das bombas pesa no custo. Produtor não sabe quando e quanto irrigar.",
      customerSegments:
        "Pequenos e médios produtores de fruticultura irrigada do Vale do São Francisco. Early adopters: cooperativas de manga e uva de Petrolina e Juazeiro.",
      uniqueValueProposition: "Irrigue só o necessário: 40% menos água e energia, sem trocar o sistema que você já tem.",
      solution:
        "Sensores de umidade de solo de baixo custo, app com recomendação diária de irrigação e acionamento remoto das bombas.",
      channels: "Parceria com cooperativas e revendas de insumos, dias de campo e assistência técnica rural.",
      revenueStreams: "Assinatura mensal por hectare monitorado e venda dos kits de sensores. Ticket médio de R$ 450/mês.",
      costStructure: "Hardware dos sensores, conectividade LoRa, equipe técnica de campo, nuvem e desenvolvimento do app.",
      keyMetrics: "Hectares monitorados, litros de água economizados por hectare, churn mensal e CAC por cooperativa.",
      unfairAdvantage:
        "Modelo de recomendação treinado com 3 safras de dados locais e sensor próprio com custo 5x menor que o importado.",
    },
  };
}

function pitchesOf(banco: BancoMock) {
  banco.pitches ??= {};
  return banco.pitches;
}

function requireStartup(banco: BancoMock, config: InternalAxiosRequestConfig) {
  const usuario = exigirUsuario(banco, config);
  if (usuario.role !== "STARTUP") throw new ErroHttp(403, "Usuário não é do tipo STARTUP");
  perfilCompleto(banco, usuario); // 404 if the startup profile doesn't exist yet
  return usuario;
}

function badRequest(message: string): never {
  throw new ErroHttp(400, message, { errors: [{ defaultMessage: message }] });
}

const ONBOARDING_STATUSES: OnboardingStatusMock[] = ["PENDENTE", "CONCLUIDO", "PULADO"];
const ONBOARDING_MAX_BYTES = 20 * 1024;

function requireOnboardingUser(banco: BancoMock, config: InternalAxiosRequestConfig) {
  const usuario = exigirUsuario(banco, config);
  if (usuario.role !== "STARTUP" && usuario.role !== "INVESTOR") {
    throw new ErroHttp(403, "Onboarding disponível apenas para STARTUP e INVESTOR");
  }
  return usuario;
}

type Rota = (args: {
  banco: BancoMock;
  corpo: Record<string, unknown>;
  config: InternalAxiosRequestConfig;
}) => unknown;

function exigirUsuario(banco: BancoMock, config: InternalAxiosRequestConfig) {
  const usuario = usuarioDoToken(banco, config);
  if (!usuario) throw new ErroHttp(401, "Não autenticado");
  return usuario;
}

const ROTAS: Record<string, Rota> = {
  "POST /api/auth/register": ({ banco, corpo }) => {
    const email = String(corpo.email ?? "").trim().toLowerCase();
    const role = corpo.role as Role;
    exigirCampos(corpo, { email: "Email é obrigatório", password: "Senha é obrigatória" });
    if (banco.usuarios.some((usuario) => usuario.email === email)) {
      throw new ErroHttp(409, "Email já cadastrado");
    }
    if (role === "ADMIN") {
      throw new ErroHttp(403, "Criação de administrador deve ser feita por bootstrap interno");
    }
    const usuario: UsuarioMock = {
      id: banco.proximoId++,
      email,
      senha: String(corpo.password),
      role: role === "INVESTOR" ? "INVESTOR" : "STARTUP",
      createdAt: new Date().toISOString(),
    };
    banco.usuarios.push(usuario);
    return { token: gerarToken(usuario), email: usuario.email, role: usuario.role };
  },

  "POST /api/auth/login": ({ banco, corpo }) => {
    const email = String(corpo.email ?? "").trim().toLowerCase();
    const usuario = banco.usuarios.find((item) => item.email === email);
    if (!usuario || usuario.senha !== String(corpo.password ?? "")) {
      throw new ErroHttp(401, "Credenciais inválidas");
    }
    return { token: gerarToken(usuario), email: usuario.email, role: usuario.role };
  },

  "GET /api/profile/me": ({ banco, config }) =>
    perfilCompleto(banco, exigirUsuario(banco, config)),

  "PUT /api/profile/me": ({ banco, corpo, config }) => {
    const usuario = exigirUsuario(banco, config);
    const perfis = usuario.role === "STARTUP" ? banco.startups : banco.investidores;
    if (usuario.role !== "ADMIN") {
      perfilCompleto(banco, usuario); // 404 se ainda não existe
      if (usuario.role === "STARTUP") atualizarStartup(perfis[usuario.id], corpo);
      else atualizarInvestidor(perfis[usuario.id], corpo);
    }
    return perfilCompleto(banco, usuario);
  },

  "POST /api/profile/startup": ({ banco, corpo, config }) => {
    const usuario = exigirUsuario(banco, config);
    if (usuario.role !== "STARTUP") throw new ErroHttp(403, "Usuário não é do tipo STARTUP");
    if (banco.startups[usuario.id]) throw new ErroHttp(409, "Perfil Startup já existe");
    exigirCampos(corpo, {
      segmento: "Segmento é obrigatório",
      estagio: "Estágio é obrigatório",
      localizacao: "Localização é obrigatória",
      modeloNegocio: "Modelo de negócio é obrigatório",
      mercadoAlvo: "Mercado alvo é obrigatório",
      capitalProcurado: "Capital procurado é obrigatório",
    });
    exigirPositivo(corpo.capitalProcurado, "Capital procurado deve ser positivo");
    banco.startups[usuario.id] = corpo;
    return perfilCompleto(banco, usuario);
  },

  "POST /api/profile/investor": ({ banco, corpo, config }) => {
    const usuario = exigirUsuario(banco, config);
    if (usuario.role !== "INVESTOR") throw new ErroHttp(403, "Usuário não é do tipo INVESTOR");
    if (banco.investidores[usuario.id]) throw new ErroHttp(409, "Perfil Investor já existe");
    exigirPositivo(corpo.ticketMinimo, "Ticket mínimo deve ser positivo");
    exigirPositivo(corpo.ticketMaximo, "Ticket máximo deve ser positivo");
    if (Number(corpo.ticketMinimo) > Number(corpo.ticketMaximo)) {
      throw new ErroHttp(400, "Ticket mínimo não pode ser maior que ticket máximo");
    }
    banco.investidores[usuario.id] = corpo;
    return perfilCompleto(banco, usuario);
  },

  "GET /api/startups/me/pitch": ({ banco, config }) => {
    const usuario = requireStartup(banco, config);
    const pitches = pitchesOf(banco);
    pitches[usuario.id] ??= samplePitch();
    return pitches[usuario.id];
  },

  // Saves the changes; the startup still has to publish them
  "PUT /api/startups/me/pitch": ({ banco, corpo, config }) => {
    const usuario = requireStartup(banco, config);
    const shortPitch = String(corpo.shortPitch ?? "");
    if (shortPitch.length > SHORT_PITCH_MAX) {
      badRequest(`shortPitch deve ter no máximo ${SHORT_PITCH_MAX} caracteres`);
    }
    const canvasBody = (corpo.leanCanvas ?? {}) as Record<string, unknown>;
    const leanCanvas: Record<string, string> = {};
    for (const field of CANVAS_FIELDS) {
      const value = String(canvasBody[field] ?? "");
      if (value.length > CANVAS_BLOCK_MAX) {
        badRequest(`leanCanvas.${field} deve ter no máximo ${CANVAS_BLOCK_MAX} caracteres`);
      }
      leanCanvas[field] = value;
    }
    const videoUrl = typeof corpo.videoUrl === "string" && corpo.videoUrl.trim() ? corpo.videoUrl : null;
    const pitch: PitchMock = {
      status: "DRAFT",
      shortPitch,
      videoUrl,
      updatedAt: new Date().toISOString(),
      leanCanvas,
    };
    pitchesOf(banco)[usuario.id] = pitch;
    return pitch;
  },

  // Submits the saved version for moderation
  "POST /api/startups/me/pitch/publish": ({ banco, config }) => {
    const usuario = requireStartup(banco, config);
    const pitches = pitchesOf(banco);
    const pitch = pitches[usuario.id] ?? samplePitch();
    if (!pitch.shortPitch.trim()) badRequest("Pitch curto é obrigatório para publicar");
    pitches[usuario.id] = { ...pitch, status: "IN_REVIEW", updatedAt: new Date().toISOString() };
    return pitches[usuario.id];
  },

   "GET /api/profile/onboarding": ({ banco, config }) => {
    const usuario = requireOnboardingUser(banco, config);
    return banco.onboarding?.[usuario.id] ?? { status: "PENDENTE", respostas: {}, atualizadoEm: null };
  },

  "PUT /api/profile/onboarding": ({ banco, corpo, config }) => {
    const usuario = requireOnboardingUser(banco, config);
    const registros = (banco.onboarding ??= {});
    const atual = registros[usuario.id] ?? { status: "PENDENTE", respostas: {}, atualizadoEm: null };

    const status = corpo.status;
    if (status != null && !ONBOARDING_STATUSES.includes(status as OnboardingStatusMock)) {
      throw new ErroHttp(400, "Status inválido");
    }
    let respostas = atual.respostas;
    if (corpo.respostas != null) {
      if (typeof corpo.respostas !== "object" || Array.isArray(corpo.respostas)) {
        throw new ErroHttp(400, "JSON malformado");
      }
      const json = JSON.stringify(corpo.respostas);
      if (new TextEncoder().encode(json).length > ONBOARDING_MAX_BYTES) {
        throw new ErroHttp(400, "Respostas excedem o limite de 20 KB");
      }
      respostas = JSON.parse(json) as Record<string, unknown>;
    }
    registros[usuario.id] = {
      status: (status as OnboardingStatusMock | null | undefined) ?? atual.status,
      respostas,
      atualizadoEm: new Date().toISOString(),
    };
    return registros[usuario.id];
  },

  "GET /api/admin/users": ({ banco, config }) => {
    const usuario = exigirUsuario(banco, config);
    if (usuario.role !== "ADMIN") throw new ErroHttp(403, "Acesso negado");
    return banco.usuarios.map(resumoUsuario);
  },
};

export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await new Promise((resolve) => setTimeout(resolve, LATENCIA_MS));

  const metodo = (config.method ?? "get").toUpperCase();
  const caminho = (config.url ?? "").split("?")[0];
  const rota = ROTAS[`${metodo} ${caminho}`];
  const corpo =
    typeof config.data === "string" && config.data ? JSON.parse(config.data) : config.data ?? {};

  const banco = lerBanco();
  try {
    if (!rota) throw new ErroHttp(404, `Rota não simulada: ${metodo} ${caminho}`);
    const data = rota({ banco, corpo, config });
    salvarBanco(banco);
    console.info(`[back simulado] ${metodo} ${caminho} -> 200`, data);
    return { data, status: 200, statusText: "OK", headers: {}, config };
  } catch (erro) {
    const http = erro instanceof ErroHttp ? erro : new ErroHttp(500, String(erro));
    console.info(`[back simulado] ${metodo} ${caminho} -> ${http.status}`, http.message);
    const response: AxiosResponse = {
      data: { status: http.status, message: http.message, ...http.extra },
      status: http.status,
      statusText: http.message,
      headers: {},
      config,
    };
    throw new AxiosError(http.message, `HTTP_${http.status}`, config, null, response);
  }
}

// Selo fixo no canto da tela, pra ninguém esquecer que o back está desligado
function mostrarSelo() {
  if (typeof document === "undefined" || document.getElementById("selo-back-simulado")) return;
  const selo = document.createElement("div");
  selo.id = "selo-back-simulado";
  selo.setAttribute("role", "status");
  selo.textContent = "Back simulado (sem servidor)";
  selo.style.cssText =
    "position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:9999;" +
    "padding:4px 10px;border-radius:999px;white-space:nowrap;" +
    "background:#FDE68A;color:#713F12;font:600 12px system-ui,sans-serif;" +
    "box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:none";
  document.body.appendChild(selo);
}

if (typeof document !== "undefined") {
  if (document.body) mostrarSelo();
  else document.addEventListener("DOMContentLoaded", mostrarSelo);
}

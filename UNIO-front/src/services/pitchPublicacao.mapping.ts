// Único lugar do front que conhece o JSON da publicação do pitch (D063 do
// back, ADR-013): GET e POST /api/profile/startup/pitch/publication e
// GET /api/discovery/startups/{id}/pitch. Funções puras, testadas com node.
import type { LeanCanvas, PitchPublication, PitchStatus, PublishedPitch } from "../types/pitch";

// moderation/dto/PitchPublicationStatusResponse
export interface PitchPublicationBack {
  id: number | null;
  version: number | null;
  status: string | null;
  reason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  requiresApproval: boolean;
  shortPitch: string | null;
  videoUrl: string | null;
  leanCanvas: Record<string, string | null> | null;
}

// moderation/dto/PublishedPitchResponse
export interface PublishedPitchBack {
  startupId: number | string;
  version: number;
  shortPitch: string | null;
  videoUrl: string | null;
  leanCanvas: Record<string, string | null> | null;
  publishedAt: string | null;
}

// Mesma lista de LEAN_CANVAS_FIELDS (utils/pitch.ts)
const CAMPOS_CANVAS: Array<keyof LeanCanvas> = [
  "problem",
  "solution",
  "keyMetrics",
  "uniqueValueProposition",
  "unfairAdvantage",
  "channels",
  "customerSegments",
  "costStructure",
  "revenueStreams",
];

// Situação do back para a do front (a página já usa estes nomes)
const STATUS_DO_BACK: Record<string, PitchStatus> = {
  EM_REVISAO: "IN_REVIEW",
  PUBLICADO: "PUBLISHED",
  REMOVIDO: "REJECTED",
};

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

export function leanCanvasDoBack(canvas: Record<string, string | null> | null | undefined): LeanCanvas {
  const resultado = {} as LeanCanvas;
  for (const campo of CAMPOS_CANVAS) resultado[campo] = texto(canvas?.[campo]);
  return resultado;
}

export function publicacaoDoBack(dados: PitchPublicationBack): PitchPublication {
  const status = dados.status ? STATUS_DO_BACK[dados.status] ?? "IN_REVIEW" : "DRAFT";
  return {
    status,
    reason: status === "REJECTED" ? texto(dados.reason) || null : null,
    submittedAt: dados.submittedAt ?? null,
    reviewedAt: dados.reviewedAt ?? null,
    // Sem a informação, vale o padrão do back (true)
    requiresApproval: dados.requiresApproval !== false,
    content:
      status === "DRAFT"
        ? null
        : {
            shortPitch: texto(dados.shortPitch),
            videoUrl: texto(dados.videoUrl) || null,
            leanCanvas: leanCanvasDoBack(dados.leanCanvas),
          },
  };
}

export function pitchPublicadoDoBack(dados: PublishedPitchBack): PublishedPitch {
  return {
    startupId: String(dados.startupId),
    version: typeof dados.version === "number" ? dados.version : 0,
    shortPitch: texto(dados.shortPitch),
    videoUrl: texto(dados.videoUrl) || null,
    leanCanvas: leanCanvasDoBack(dados.leanCanvas),
    publishedAt: dados.publishedAt ?? null,
  };
}

// Back antigo, sem a rota (404 em GET .../publication): nunca enviou
export const PUBLICACAO_VAZIA: PitchPublication = {
  status: "DRAFT",
  reason: null,
  submittedAt: null,
  reviewedAt: null,
  requiresApproval: true,
  content: null,
};

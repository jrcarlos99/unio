export type PitchStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "REJECTED";

export interface LeanCanvas {
  problem: string;
  customerSegments: string;
  uniqueValueProposition: string;
  solution: string;
  channels: string;
  revenueStreams: string;
  costStructure: string;
  keyMetrics: string;
  unfairAdvantage: string;
}

export type LeanCanvasField = keyof LeanCanvas;

export interface StartupPitch {
  status: PitchStatus;
  shortPitch: string;
  videoUrl: string | null;
  updatedAt: string | null;
  leanCanvas: LeanCanvas;
}

export interface StartupPitchResponse {
  status: PitchStatus;
  shortPitch: string | null;
  videoUrl: string | null;
  updatedAt: string | null;
  leanCanvas: { [K in LeanCanvasField]: string | null } | null;
}

export interface UpdatePitchRequest {
  shortPitch: string;
  videoUrl: string | null;
  leanCanvas: LeanCanvas;
}

export interface PitchFormValues {
  shortPitch: string;
  videoUrl: string;
  leanCanvas: LeanCanvas;
}

export type PitchFieldKey = "shortPitch" | "videoUrl" | LeanCanvasField;

export type PitchFormErrors = Partial<Record<PitchFieldKey, string>>;

export type PitchTab = "pitch" | "canvas";

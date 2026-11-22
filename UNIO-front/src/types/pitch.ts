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
  // From the last submission (GET /api/profile/startup/pitch/publication);
  // DRAFT when the startup never submitted
  status: PitchStatus;
  shortPitch: string;
  videoUrl: string | null;
  updatedAt: string | null;
  leanCanvas: LeanCanvas;
  publication?: PitchPublication | null;
}

// Last submission of the startup's own pitch (D063 of the backend, ADR-013)
export interface PitchPublication {
  status: PitchStatus;
  // Reason given by the moderation when the pitch was removed
  reason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  // unio.moderation.pitch-requer-aprovacao: true = goes through review first
  requiresApproval: boolean;
  // What was submitted; null when never submitted
  content: UpdatePitchRequest | null;
}

// Published pitch of a startup, as investors see it
export interface PublishedPitch {
  startupId: string;
  version: number;
  shortPitch: string;
  videoUrl: string | null;
  leanCanvas: LeanCanvas;
  publishedAt: string | null;
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

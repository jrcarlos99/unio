import api from "./api";

export interface AiRecommendation {
  candidateId: number;
  candidateName: string;
  compatibility: number;
  summary: string;
  strengths: string[];
  attentionPoints: string[];
}

export interface AiRecommendationResponse {
  candidateType: "STARTUP" | "INVESTOR";
  recommendations: AiRecommendation[];
}

export async function getAgenteRecommendations(limit = 10): Promise<AiRecommendationResponse> {
  const { data } = await api.get<AiRecommendationResponse>("/api/agente/recommendations", {
    params: { limit },
  });
  return data;
}

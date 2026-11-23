package br.com.unio.matchmaking_backend.agente.dto;

import java.util.List;

public record AiRecommendationResponse(
        String candidateType,
        List<AiRecommendation> recommendations
) {
}

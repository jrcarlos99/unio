package br.com.unio.matchmaking_backend.agente.dto;

import java.util.List;
import java.util.Map;

public record AiRecommendation(
        Long candidateId,
        String candidateName,
        Map<String, Object> candidateProfile,
        Integer compatibility,
        String classification,
        int dataCoverage,
        String summary,
        List<String> strengths,
        List<String> attentionPoints,
        List<AiRecommendationFactor> factors,
        String nextStep,
        String interestStatus,
        boolean saved
) {
}

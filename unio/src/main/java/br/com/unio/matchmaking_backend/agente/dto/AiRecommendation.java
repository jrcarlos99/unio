package br.com.unio.matchmaking_backend.agente.dto;

import java.util.List;

public record AiRecommendation(
        Long candidateId,
        String candidateName,
        int compatibility,
        String summary,
        List<String> strengths,
        List<String> attentionPoints
) {
}

package br.com.unio.matchmaking_backend.agente.dto;

public record AiRecommendationFactor(
        String factorCode,
        String label,
        Integer score,
        int weight,
        String explanation
) {
}

package br.com.unio.matchmaking_backend.profile.dto;

public record DashboardStartupResponse(
        Long totalVisualizacoes,
        long totalMatches,
        long totalReunioesAgendadas,
        long totalMensagensNaoLidas
) {
}

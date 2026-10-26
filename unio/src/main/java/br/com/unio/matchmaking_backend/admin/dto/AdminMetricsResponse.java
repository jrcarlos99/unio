package br.com.unio.matchmaking_backend.admin.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminMetricsResponse {

    // T06 — cadastros e matchmaking
    private long totalStartups;
    private long totalInvestors;
    private long totalMatches;
    private long totalFeedbacks;
    private Map<String, Long> distributionByClassification;

    // T16 — comunicação (RF05) e avaliação pós-interação (RF10)
    private long totalConversations;
    private long totalMessages;
    private long totalMeetings;
    /** Quantidade de reuniões em cada status (PENDENTE, CONFIRMADA, RECUSADA, CANCELADA, REALIZADA). */
    private Map<String, Long> meetingsByStatus;
    private long totalReviews;
    /** Média geral das avaliações (1 casa decimal) ou null se ainda não houver avaliações. */
    private Double averageRating;
}

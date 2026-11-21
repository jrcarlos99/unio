package br.com.unio.matchmaking_backend.scorecard.recommendation.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record RecommendedInvestorDto(
        UUID investorId,
        String investorEmail,
        BigDecimal totalScore
) {}
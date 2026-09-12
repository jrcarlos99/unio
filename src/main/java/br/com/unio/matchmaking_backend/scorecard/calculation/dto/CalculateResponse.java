package br.com.unio.matchmaking_backend.scorecard.calculation.dto;

import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalculateResponse {

    private Long matchScoreId;
    private UUID startupId;
    private UUID investorId;
    private Long scorePolicyId;
    private BigDecimal scoreFinal;
    private MatchScoreClassification classification;
    private boolean recalculated;
    private Instant calculatedAt;
}
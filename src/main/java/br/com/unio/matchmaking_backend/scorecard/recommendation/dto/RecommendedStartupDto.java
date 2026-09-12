package br.com.unio.matchmaking_backend.scorecard.recommendation.dto;

import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.DimensionBreakdownDto;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.FactorDto;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.NextStepDto;
import java.math.BigDecimal;
import java.util.List;
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
public class RecommendedStartupDto {

    private UUID startupId;
    private String startupName;
    private BigDecimal scoreFinal;
    private MatchScoreClassification classification;
    private List<DimensionBreakdownDto> dimensions;
    private List<FactorDto> topPositiveFactors;
    private List<FactorDto> topAttentionFactors;
    private NextStepDto nextStep;
}
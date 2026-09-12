package br.com.unio.matchmaking_backend.scorecard.calculation.dto;

import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
import br.com.unio.matchmaking_backend.scorecard.common.ScoreDimension;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
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
public class ScoreCalculationResult {

    private BigDecimal totalScore;
    private MatchScoreClassification classification;
    private List<CriterionEvaluation> criterionEvaluations;
    private Map<ScoreDimension, BigDecimal> dimensionScores;
    private boolean criticalViolation;
}
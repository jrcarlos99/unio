package br.com.unio.matchmaking_backend.scorecard.calculation.dto;

import br.com.unio.matchmaking_backend.scorecard.common.CriticalityLevel;
import br.com.unio.matchmaking_backend.scorecard.common.ScoreDimension;
import java.math.BigDecimal;
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
public class CriterionEvaluation {

    private String code;
    private ScoreDimension dimension;
    private BigDecimal rawScore;
    private BigDecimal adjustedScore;
    private BigDecimal weight;
    private CriticalityLevel criticality;
    private String explanation;
    private boolean failed;
}
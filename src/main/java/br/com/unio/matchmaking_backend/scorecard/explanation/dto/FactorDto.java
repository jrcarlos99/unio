package br.com.unio.matchmaking_backend.scorecard.explanation.dto;

import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreFactorType;
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
public class FactorDto {

    private MatchScoreFactorType type;
    private Integer rank;
    private ScoreDimension dimension;
    private String factorCode;
    private String factorLabel;
    private BigDecimal factorScore;
    private BigDecimal weightApplied;
    private String explanation;
}
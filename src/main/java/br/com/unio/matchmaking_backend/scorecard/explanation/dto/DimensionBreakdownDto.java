package br.com.unio.matchmaking_backend.scorecard.explanation.dto;

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
public class DimensionBreakdownDto {

    private ScoreDimension dimension;
    private BigDecimal score;
    private BigDecimal weight;
    private BigDecimal weightedScore;
}
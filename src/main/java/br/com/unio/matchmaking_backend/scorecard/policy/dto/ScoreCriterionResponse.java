package br.com.unio.matchmaking_backend.scorecard.policy.dto;

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
public class ScoreCriterionResponse {

    private Long id;
    private Long scorePolicyId;
    private String code;
    private String label;
    private ScoreDimension dimension;
    private BigDecimal weight;
    private CriticalityLevel criticality;
    private boolean active;
}
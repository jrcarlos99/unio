package br.com.unio.matchmaking_backend.scorecard.calculation.dto;

import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.explanation.MatchScoreFactor;
import java.util.List;
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
public class ScorePersistenceResult {

    private MatchScore matchScore;
    private List<MatchScoreFactor> factors;
    private boolean recalculated;
}
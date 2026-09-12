package br.com.unio.matchmaking_backend.scorecard.explanation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchScoreFactorRepository extends JpaRepository<MatchScoreFactor, Long> {

    List<MatchScoreFactor> findByMatchScoreIdOrderByTypeAscRankAsc(Long matchScoreId);
}

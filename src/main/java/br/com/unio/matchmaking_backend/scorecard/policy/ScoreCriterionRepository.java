package br.com.unio.matchmaking_backend.scorecard.policy;

import br.com.unio.matchmaking_backend.scorecard.common.ScoreDimension;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScoreCriterionRepository extends JpaRepository<ScoreCriterion, Long> {

    List<ScoreCriterion> findByScorePolicyIdAndActiveTrue(Long scorePolicyId);

    List<ScoreCriterion> findByScorePolicyIdAndDimension(Long scorePolicyId, ScoreDimension dimension);
}

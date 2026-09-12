package br.com.unio.matchmaking_backend.scorecard.policy;

import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScorePolicyRepository extends JpaRepository<ScorePolicy, Long> {

    Optional<ScorePolicy> findByInvestorProfileTypeAndActiveTrue(InvestorProfileType type);

    List<ScorePolicy> findByInvestorProfileType(InvestorProfileType type);
}

package br.com.unio.matchmaking_backend.scorecard.calculation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchScoreRepository extends JpaRepository<MatchScore, Long> {

    Optional<MatchScore> findByInvestorIdAndStartupIdAndScorePolicyId(UUID investorId, UUID startupId, Long scorePolicyId);

    List<MatchScore> findByInvestorId(UUID investorId);

    List<MatchScore> findByStartupId(UUID startupId);
}

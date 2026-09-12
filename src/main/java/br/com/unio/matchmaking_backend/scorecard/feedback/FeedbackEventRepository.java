package br.com.unio.matchmaking_backend.scorecard.feedback;

import br.com.unio.matchmaking_backend.scorecard.common.FeedbackAction;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackEventRepository extends JpaRepository<FeedbackEvent, Long> {

    List<FeedbackEvent> findByInvestorIdAndStartupIdAndScorePolicyIdAndActionAndCreatedAtAfter(
        UUID investorId,
        UUID startupId,
        Long scorePolicyId,
        FeedbackAction action,
        Instant since
    );

    List<FeedbackEvent> findByInvestorIdAndStartupId(UUID investorId, UUID startupId);
}

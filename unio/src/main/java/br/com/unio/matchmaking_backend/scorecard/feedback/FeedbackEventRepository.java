package br.com.unio.matchmaking_backend.scorecard.feedback;

import br.com.unio.matchmaking_backend.scorecard.common.FeedbackAction;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackEventRepository extends JpaRepository<FeedbackEvent, Long> {

    List<FeedbackEvent> findByInvestorIdAndStartupIdAndScorePolicyIdAndActionAndCreatedAtAfter(
        UUID investorId,
        UUID startupId,
        Long scorePolicyId,
        FeedbackAction action,
        Instant since
    );

    List<FeedbackEvent> findByInvestorIdAndStartupId(UUID investorId, UUID startupId);

    /** T13 — apaga os feedbacks em que o titular aparece. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from FeedbackEvent f where f.investorId = :participantId or f.startupId = :participantId")
    int deleteByParticipant(@Param("participantId") UUID participantId);
}

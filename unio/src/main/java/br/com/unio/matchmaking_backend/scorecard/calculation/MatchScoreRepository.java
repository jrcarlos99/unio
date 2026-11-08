package br.com.unio.matchmaking_backend.scorecard.calculation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchScoreRepository extends JpaRepository<MatchScore, Long> {

    Optional<MatchScore> findByInvestorIdAndStartupIdAndScorePolicyId(UUID investorId, UUID startupId, Long scorePolicyId);

    List<MatchScore> findByInvestorId(UUID investorId);

    List<MatchScore> findByStartupId(UUID startupId);

    Optional<MatchScore> findByInvestorIdAndStartupId(UUID investorId, UUID startupId);

    /** T16 — distribuição por classificação calculada no banco (antes era findAll + groupingBy). */
    @Query("select m.classification, count(m) from MatchScore m group by m.classification")
    List<Object[]> countByClassification();

    /** T13 — apaga os scores em que o titular aparece (rodar depois de apagar os fatores). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from MatchScore m where m.investorId = :participantId or m.startupId = :participantId")
    int deleteByParticipant(@Param("participantId") UUID participantId);

}

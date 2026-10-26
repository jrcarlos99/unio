package br.com.unio.matchmaking_backend.scorecard.explanation;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchScoreFactorRepository extends JpaRepository<MatchScoreFactor, Long> {

    List<MatchScoreFactor> findByMatchScoreIdOrderByTypeAscRankAsc(Long matchScoreId);

    /** T13 — apaga os fatores dos scores em que o titular aparece (como investidor ou startup). */
    @Modifying
    @Query("""
            delete from MatchScoreFactor f
            where f.matchScore.id in (
                select m.id from MatchScore m where m.investorId = :participantId or m.startupId = :participantId
            )
            """)
    int deleteByParticipant(@Param("participantId") UUID participantId);
}

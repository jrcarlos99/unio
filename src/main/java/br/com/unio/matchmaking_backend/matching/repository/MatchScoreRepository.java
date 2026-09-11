package br.com.unio.matchmaking_backend.matching.repository;

import br.com.unio.matchmaking_backend.matching.entity.MatchScore;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchScoreRepository extends JpaRepository<MatchScore, Long> {

    List<MatchScore> findBySourceUserId(Long sourceUserId);

    MatchScore findBySourceUserIdAndTargetUserId(Long sourceUserId, Long targetUserId);
}

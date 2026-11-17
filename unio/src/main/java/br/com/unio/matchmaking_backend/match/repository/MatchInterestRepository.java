package br.com.unio.matchmaking_backend.match.repository;

import br.com.unio.matchmaking_backend.match.entity.MatchInterest;
import br.com.unio.matchmaking_backend.match.entity.MatchInterestStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchInterestRepository extends JpaRepository<MatchInterest, Long> {

    Optional<MatchInterest> findByStartupIdAndInvestorIdAndLikedByUserId(
            Long startupId, Long investorId, Long likedByUserId);

    List<MatchInterest> findByStartupIdAndInvestorIdAndLikedByUserIdNot(
            Long startupId, Long investorId, Long likedByUserId);

    List<MatchInterest> findByLikedByUserIdAndStatusOrderByCreatedAtDesc(
            Long likedByUserId, MatchInterestStatus status);
}

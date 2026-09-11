package br.com.unio.matchmaking_backend.matching.repository;

import br.com.unio.matchmaking_backend.matching.entity.SwipeAction;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SwipeActionRepository extends JpaRepository<SwipeAction, Long> {

    Optional<SwipeAction> findBySourceUserIdAndTargetUserId(Long sourceUserId, Long targetUserId);

    List<SwipeAction> findBySourceUserId(Long sourceUserId);

    List<SwipeAction> findByTargetUserId(Long targetUserId);
}

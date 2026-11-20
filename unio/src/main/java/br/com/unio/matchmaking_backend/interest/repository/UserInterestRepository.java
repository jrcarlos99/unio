package br.com.unio.matchmaking_backend.interest.repository;

import br.com.unio.matchmaking_backend.interest.entity.UserInterest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserInterestRepository extends JpaRepository<UserInterest, Long> {

    /** Idempotente: a UNIQUE (from_user_id, to_user_id) ignora a repetição. Devolve 1 se gravou. */
    @Modifying(flushAutomatically = true)
    @Query(value = """
            insert into user_interests (from_user_id, to_user_id, created_at)
            values (:fromUserId, :toUserId, now())
            on conflict (from_user_id, to_user_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);

    Optional<UserInterest> findByFromUserIdAndToUserId(Long fromUserId, Long toUserId);

    boolean existsByFromUserIdAndToUserId(Long fromUserId, Long toUserId);

    @Modifying(flushAutomatically = true)
    @Query("delete from UserInterest i where i.fromUserId = :fromUserId and i.toUserId = :toUserId")
    int deletePair(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);

    List<UserInterest> findByFromUserId(Long fromUserId);

    List<UserInterest> findByToUserId(Long toUserId);

    long countByToUserId(Long toUserId);

    /** Ids com quem o usuário tem match mútuo (as duas linhas existem). */
    @Query(value = """
            select a.to_user_id from user_interests a
            join user_interests b on b.from_user_id = a.to_user_id and b.to_user_id = a.from_user_id
            where a.from_user_id = :userId
            """, nativeQuery = true)
    List<Long> findMatchedUserIds(@Param("userId") Long userId);

    /** D053: pares com match mútuo na plataforma (cada par conta uma vez). */
    @Query(value = """
            select count(*) from user_interests a
            join user_interests b on b.from_user_id = a.to_user_id and b.to_user_id = a.from_user_id
            where a.from_user_id < a.to_user_id
            """, nativeQuery = true)
    long countMutualMatches();

    /** D055: exclusão de conta apaga os interesses do titular, enviados e recebidos. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from UserInterest i where i.fromUserId = :userId or i.toUserId = :userId")
    int deleteAllInvolving(@Param("userId") Long userId);
}

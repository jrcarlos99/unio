package br.com.unio.matchmaking_backend.interest.repository;

import br.com.unio.matchmaking_backend.interest.entity.UserSaved;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserSavedRepository extends JpaRepository<UserSaved, Long> {

    /** Idempotente: a UNIQUE (user_id, target_user_id) ignora a repetição. */
    @Modifying(flushAutomatically = true)
    @Query(value = """
            insert into user_saved (user_id, target_user_id, created_at)
            values (:userId, :targetUserId, now())
            on conflict (user_id, target_user_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("userId") Long userId, @Param("targetUserId") Long targetUserId);

    @Modifying(flushAutomatically = true)
    @Query("delete from UserSaved s where s.userId = :userId and s.targetUserId = :targetUserId")
    int deletePair(@Param("userId") Long userId, @Param("targetUserId") Long targetUserId);

    List<UserSaved> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** D055: exclusão de conta apaga os salvos do titular e as vezes em que ele foi salvo. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from UserSaved s where s.userId = :userId or s.targetUserId = :userId")
    int deleteAllInvolving(@Param("userId") Long userId);
}

package br.com.unio.matchmaking_backend.popularity.repository;

import br.com.unio.matchmaking_backend.popularity.entity.ProfileView;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProfileViewRepository extends JpaRepository<ProfileView, Long> {

    /**
     * D041: registra a visita do dia; se o visitante já viu o perfil hoje, não faz nada
     * (ON CONFLICT na UNIQUE da V25, sem erro e sem corrida entre cliques).
     *
     * @return 1 quando contou uma visita nova, 0 quando já existia
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            insert into profile_views (target_user_id, viewer_user_id, viewed_on)
            values (:targetUserId, :viewerUserId, :viewedOn)
            on conflict (target_user_id, viewer_user_id, viewed_on) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("targetUserId") Long targetUserId,
                       @Param("viewerUserId") Long viewerUserId,
                       @Param("viewedOn") LocalDate viewedOn);

    /** Visitas recebidas entre duas datas, inclusive. Só o total, nunca quem visitou. */
    @Query("""
            select count(v) from ProfileView v
            where v.targetUserId = :targetUserId
              and v.viewedOn between :from and :to
            """)
    long countReceivedBetween(@Param("targetUserId") Long targetUserId,
                              @Param("from") LocalDate from,
                              @Param("to") LocalDate to);

    /** Export LGPD (D044): visitas feitas pelo próprio titular. */
    List<ProfileView> findByViewerUserIdOrderByViewedOnDesc(Long viewerUserId);

    /** Export LGPD (D044): só o total de visitas recebidas, sem os visitantes. */
    long countByTargetUserId(Long targetUserId);

    /** Exclusão de conta (T13, D044): apaga as visitas do titular como visitante e como visitado. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from ProfileView v where v.viewerUserId = :userId or v.targetUserId = :userId")
    int deleteAllInvolving(@Param("userId") Long userId);
}

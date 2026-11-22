package br.com.unio.matchmaking_backend.moderation.repository;

import br.com.unio.matchmaking_backend.moderation.entity.StartupPitchPublication;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StartupPitchPublicationRepository extends JpaRepository<StartupPitchPublication, Long> {

    /** O envio que vale: o de maior versão da startup. */
    Optional<StartupPitchPublication> findFirstByUserIdOrderByVersionDesc(Long userId);

    @Query("select coalesce(max(p.version), 0) from StartupPitchPublication p where p.userId = :userId")
    int findMaxVersion(@Param("userId") Long userId);

    /** Maior versão de cada startup, para marcar quais envios são o atual. */
    @Query("select p.userId, max(p.version) from StartupPitchPublication p group by p.userId")
    List<Object[]> findLatestVersionPerUser();

    List<StartupPitchPublication> findAllByOrderBySubmittedAtDesc();

    /** T13 (LGPD): a exclusão da conta apaga também as cópias publicadas do pitch. */
    @Modifying
    @Query("delete from StartupPitchPublication p where p.userId = :userId")
    int deleteByUserId(@Param("userId") Long userId);
}

package br.com.unio.matchmaking_backend.moderation.repository;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModeration;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModerationStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountModerationRepository extends JpaRepository<AccountModeration, Long> {

    /** D063: contas que saem da descoberta e das listas públicas (tudo que não é APROVADO). */
    @Query("select m.userId from AccountModeration m where m.status in :statuses")
    List<Long> findUserIdsByStatusIn(@Param("statuses") Collection<AccountModerationStatus> statuses);

    /** D063: contas moderáveis: STARTUP e INVESTOR, não excluídas pelo titular. */
    @Query("select u from User u where u.role in :roles and u.deletedAt is null")
    List<User> findModeratableUsers(@Param("roles") Collection<Role> roles);
}

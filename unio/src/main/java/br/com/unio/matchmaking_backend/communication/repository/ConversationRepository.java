package br.com.unio.matchmaking_backend.communication.repository;

import br.com.unio.matchmaking_backend.communication.entity.Conversation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByStartupUserIdAndInvestorUserId(Long startupUserId, Long investorUserId);

    @Query("""
            select c from Conversation c
            join fetch c.startupUser
            join fetch c.investorUser
            where c.startupUser.id = :userId or c.investorUser.id = :userId
            order by coalesce(c.lastMessageAt, c.createdAt) desc
            """)
    List<Conversation> findAllByParticipant(@Param("userId") Long userId);
}

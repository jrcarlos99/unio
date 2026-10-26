package br.com.unio.matchmaking_backend.communication.repository;

import br.com.unio.matchmaking_backend.communication.entity.Message;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);

    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(Long conversationId);

    long countByConversationIdAndSenderIdNotAndReadAtIsNull(Long conversationId, Long userId);

    /** Marca como lidas as mensagens recebidas (enviadas pelo outro participante). */
    @Modifying
    @Query("""
            update Message m set m.readAt = :readAt
            where m.conversation.id = :conversationId
              and m.sender.id <> :userId
              and m.readAt is null
            """)
    int markAsRead(@Param("conversationId") Long conversationId,
                   @Param("userId") Long userId,
                   @Param("readAt") Instant readAt);

    /** T13 — substitui o conteúdo das mensagens enviadas por um titular que excluiu a conta. */
    @Modifying
    @Query("update Message m set m.content = :content where m.sender.id = :userId")
    int replaceContentSentBy(@Param("userId") Long userId, @Param("content") String content);
}

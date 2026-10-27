package br.com.unio.matchmaking_backend.communication.dto;

import br.com.unio.matchmaking_backend.communication.entity.Message;
import java.time.Instant;

public record MessageResponse(
        Long id,
        Long conversationId,
        Long senderId,
        boolean mine,
        String content,
        Instant createdAt,
        Instant readAt
) {

    public static MessageResponse from(Message message, Long currentUserId) {
        Long senderId = message.getSender().getId();
        return new MessageResponse(
                message.getId(),
                message.getConversation().getId(),
                senderId,
                senderId.equals(currentUserId),
                message.getContent(),
                message.getCreatedAt(),
                message.getReadAt());
    }
}

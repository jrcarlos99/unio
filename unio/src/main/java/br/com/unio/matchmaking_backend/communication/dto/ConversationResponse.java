package br.com.unio.matchmaking_backend.communication.dto;

import java.time.Instant;

/**
 * Conversa vista pelo usuário logado.
 *
 * @param lastMessagePreview início da última mensagem (até 120 caracteres), ou null
 * @param unreadCount        mensagens recebidas ainda não lidas
 */
public record ConversationResponse(
        Long id,
        ParticipantDto participant,
        Instant createdAt,
        Instant lastMessageAt,
        String lastMessagePreview,
        long unreadCount
) {
}

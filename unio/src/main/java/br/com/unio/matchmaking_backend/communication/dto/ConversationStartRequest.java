package br.com.unio.matchmaking_backend.communication.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Abre (ou recupera) a conversa com outro usuário.
 *
 * @param participantId id do usuário do outro lado (mesmo id do perfil de startup/investidor)
 */
public record ConversationStartRequest(
        @NotNull(message = "participantId é obrigatório")
        @Positive(message = "participantId inválido")
        Long participantId
) {
}

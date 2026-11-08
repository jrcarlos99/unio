package br.com.unio.matchmaking_backend.communication.dto;

import java.util.List;

/**
 * Página de mensagens, da mais recente para a mais antiga.
 * Formato próprio (em vez de serializar o Page do Spring Data, que não tem JSON estável).
 */
public record MessagePageResponse(
        List<MessageResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}

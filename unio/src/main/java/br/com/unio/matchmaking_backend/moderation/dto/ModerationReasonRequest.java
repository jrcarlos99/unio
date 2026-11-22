package br.com.unio.matchmaking_backend.moderation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** D063: corpo de recusar e suspender conta e de remover pitch. */
public record ModerationReasonRequest(
        @Schema(description = "Motivo, de 3 a 255 caracteres. A startup vê o motivo da remoção do pitch.",
                example = "Conteúdo com dados de contato pessoais")
        @NotBlank(message = "Informe o motivo, com 3 a 255 caracteres")
        @Size(min = 3, max = 255, message = "Informe o motivo, com 3 a 255 caracteres")
        String reason
) {
}

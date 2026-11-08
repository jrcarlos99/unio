package br.com.unio.matchmaking_backend.communication.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/**
 * Proposta de reunião. {@code startsAt} em ISO-8601 com fuso (ex.: 2026-11-03T14:00:00-03:00).
 */
public record MeetingCreateRequest(
        @NotNull(message = "participantId é obrigatório")
        @Positive(message = "participantId inválido")
        Long participantId,

        @NotBlank(message = "O título é obrigatório")
        @Size(max = 150, message = "O título deve ter no máximo 150 caracteres")
        String title,

        @Size(max = 2000, message = "A pauta deve ter no máximo 2000 caracteres")
        String agenda,

        @NotNull(message = "A data/hora de início é obrigatória")
        @Future(message = "A reunião deve ser marcada para o futuro")
        Instant startsAt,

        @NotNull(message = "A duração é obrigatória")
        @Min(value = 15, message = "A duração mínima é de 15 minutos")
        @Max(value = 240, message = "A duração máxima é de 240 minutos")
        Integer durationMinutes,

        @Size(max = 500, message = "O link deve ter no máximo 500 caracteres")
        @Pattern(regexp = "^https://\\S+$", message = "O link da reunião deve começar com https://")
        String meetingUrl
) {
}

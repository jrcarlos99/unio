package br.com.unio.matchmaking_backend.communication.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Corpo opcional do aceite (D032). Obrigatório quando a proposta vigente tem
 * mais de um horário: {@code startsAt} precisa ser um deles.
 */
@Schema(description = "Horário escolhido entre os sugeridos")
public record MeetingAcceptRequest(
        @Schema(description = "Um dos suggestedTimes. Pode faltar se só houver um horário",
                example = "2026-11-05T17:00:00Z", nullable = true)
        Instant startsAt
) {
}

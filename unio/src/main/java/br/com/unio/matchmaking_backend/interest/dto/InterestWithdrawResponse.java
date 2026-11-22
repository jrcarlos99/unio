package br.com.unio.matchmaking_backend.interest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** D049 e D051: resposta de DELETE /api/interests/{targetUserId}. */
@Schema(description = "Resultado de retirar o interesse (e desfazer o match, se havia)")
public record InterestWithdrawResponse(
        @Schema(description = "Novo estado: NONE, ou RECEIVED se o outro lado continua interessado")
        InterestStatus status,
        @Schema(description = "Se havia match: quantas reuniões futuras (PENDENTE ou CONFIRMADA) foram canceladas",
                example = "1")
        int canceledMeetings
) {
}

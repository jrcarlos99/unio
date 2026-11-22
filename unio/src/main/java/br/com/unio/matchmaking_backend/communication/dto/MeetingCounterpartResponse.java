package br.com.unio.matchmaking_backend.communication.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

/**
 * Pessoa com quem dá para marcar reunião (D037): usuário ativo, do papel
 * complementar, com perfil criado. Sem e-mail e sem documento.
 */
@Schema(description = "Contraparte disponível para reunião (sem e-mail nem documento)")
public record MeetingCounterpartResponse(
        @Schema(description = "Id do usuário, o mesmo participantId de POST /api/meetings", example = "12")
        Long userId,
        @Schema(description = "Nome da startup; para investidor, o nome de exibição do ParticipantService",
                example = "Tidalog")
        String name,
        @Schema(allowableValues = {"STARTUP", "INVESTOR"})
        String role,
        @Schema(description = "Startup: segmento e estágio. Investidor: tipo de perfil",
                example = "Logística • Seed")
        String subtitle,
        @Schema(nullable = true, description = "Só startup")
        String segment,
        @Schema(nullable = true, description = "Só startup")
        String stage,
        @Schema(nullable = true, description = "Só investidor (perfilRisco)", example = "Investidor Anjo")
        String tipoInvestidor,
        @Schema(nullable = true, description = "Só investidor")
        BigDecimal ticketMin,
        @Schema(nullable = true, description = "Só investidor")
        BigDecimal ticketMax,
        @Schema(nullable = true, description = "Score do scorecard (0 a 100) entre os dois, quando já calculado",
                example = "87.5")
        BigDecimal matchScore
) {
}

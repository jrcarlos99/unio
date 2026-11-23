package br.com.unio.matchmaking_backend.interest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** D049: resposta de PUT /api/interests/{targetUserId}. */
@Schema(description = "Resultado de Tenho interesse")
public record InterestResponse(
        @Schema(allowableValues = {"ENVIADO", "MATCH"},
                description = "ENVIADO: aguardando o outro lado. MATCH: o outro lado já tinha demonstrado interesse")
        String status,
        @Schema(nullable = true, description = "Quando o match aconteceu (o segundo interesse); só no MATCH")
        Instant matchedAt
) {
    public static final String SENT = "ENVIADO";
    public static final String MATCH = "MATCH";
}

package br.com.unio.matchmaking_backend.interest.dto;

import br.com.unio.matchmaking_backend.discovery.dto.PublicProfileDto;
import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * D050 e D052: item resumido de Meus unios (GET /api/interests/matches) e dos
 * salvos (GET /api/saved). {@code contact} só aparece nos matches.
 */
@Schema(description = "Resumo de um match ou de um salvo. contact só existe em GET /api/interests/matches")
public record ConnectionResponse(
        @Schema(example = "12") Long userId,
        @Schema(example = "Tidalog") String name,
        @Schema(allowableValues = {"STARTUP", "INVESTOR"}) String role,
        @Schema(nullable = true, description = "Só nos matches") Instant matchedAt,
        @Schema(nullable = true, description = "Só nos salvos") Instant savedAt,
        @Schema(nullable = true, description = "Último score já calculado do par (não recalcula)")
        BigDecimal scoreFinal,
        @Schema(nullable = true) MatchScoreClassification classification,
        InterestStatus interestStatus,
        boolean saved,
        PublicProfileDto profile,
        @JsonInclude(JsonInclude.Include.NON_NULL)
        @Schema(nullable = true, description = "Só nos matches (D052)")
        ContactDto contact
) {
}

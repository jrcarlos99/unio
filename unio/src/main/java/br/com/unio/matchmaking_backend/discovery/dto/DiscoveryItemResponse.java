package br.com.unio.matchmaking_backend.discovery.dto;

import br.com.unio.matchmaking_backend.interest.dto.InterestStatus;
import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.DimensionBreakdownDto;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.FactorDto;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.NextStepDto;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** D046: candidato da descoberta (lista e detalhe), com o score do scorecard. */
@Schema(description = "Candidato da descoberta com o score calculado pelo scorecard")
public record DiscoveryItemResponse(
        @Schema(description = "Id do usuário (o mesmo de /api/interests, /api/saved e participantId)",
                example = "12")
        Long userId,
        @Schema(description = "Nome de exibição (ParticipantService.displayName)", example = "Tidalog")
        String name,
        @Schema(allowableValues = {"STARTUP", "INVESTOR"}) String role,
        PublicProfileDto profile,
        @Schema(description = "Score de 0 a 100. 0 quando um critério eliminatório falha (SEM_MATCH)",
                example = "78.75")
        BigDecimal scoreFinal,
        MatchScoreClassification classification,
        List<DimensionBreakdownDto> dimensions,
        List<FactorDto> topPositiveFactors,
        List<FactorDto> topAttentionFactors,
        NextStepDto nextStep,
        ScorecardRefDto scorecard,
        @Schema(description = "NONE, SENT (eu demonstrei), RECEIVED (o outro lado demonstrou) ou MATCH")
        InterestStatus interestStatus,
        @Schema(description = "Está nos meus salvos") boolean saved,
        @Schema(nullable = true, description = "Quando o score foi calculado; nulo no SEM_MATCH por critério "
                + "eliminatório, que não é gravado")
        Instant calculatedAt
) {
}

package br.com.unio.matchmaking_backend.discovery.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

/** Par do scorecard, no formato que POST /api/scorecard/feedback espera (D046). */
@Schema(description = "Ids do par no scorecard (UUID Long-encoded) para POST /api/scorecard/feedback")
public record ScorecardRefDto(
        @Schema(example = "00000000-0000-0000-0000-00000000000c") UUID startupId,
        @Schema(example = "00000000-0000-0000-0000-000000000007") UUID investorId,
        @Schema(example = "1") Long scorePolicyId
) {
}

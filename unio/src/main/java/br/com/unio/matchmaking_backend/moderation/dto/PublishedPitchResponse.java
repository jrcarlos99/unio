package br.com.unio.matchmaking_backend.moderation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.Map;

/** D063 (RF06): o pitch publicado de uma startup, como o investidor vê. */
public record PublishedPitchResponse(
        Long startupId,
        Integer version,
        @Schema(description = "Pitch curto (até 280 caracteres no front)") String shortPitch,
        @Schema(description = "Link do YouTube ou do Vimeo; null se não houver") String videoUrl,
        @Schema(description = "problem, solution, keyMetrics, uniqueValueProposition, unfairAdvantage, "
                + "channels, customerSegments, costStructure, revenueStreams")
        Map<String, String> leanCanvas,
        @Schema(description = "Quando ficou público (aprovação, ou envio se não exigir aprovação)")
        Instant publishedAt
) {
}

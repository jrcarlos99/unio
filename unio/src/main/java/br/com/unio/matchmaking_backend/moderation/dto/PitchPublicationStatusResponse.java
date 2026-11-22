package br.com.unio.matchmaking_backend.moderation.dto;

import br.com.unio.matchmaking_backend.moderation.entity.PitchPublicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.Map;

/**
 * D063: o último envio do pitch da própria startup. Sem nenhum envio, {@code id},
 * {@code status} e o conteúdo vêm null.
 */
public record PitchPublicationStatusResponse(
        Long id,
        Integer version,
        @Schema(description = "EM_REVISAO, PUBLICADO, REMOVIDO ou null se nunca enviou") PitchPublicationStatus status,
        @Schema(description = "Motivo da remoção pela moderação; null nos outros casos") String reason,
        Instant submittedAt,
        Instant reviewedAt,
        @Schema(description = "unio.moderation.pitch-requer-aprovacao: true = o envio passa pela revisão")
        boolean requiresApproval,
        String shortPitch,
        String videoUrl,
        Map<String, String> leanCanvas
) {
}

package br.com.unio.matchmaking_backend.moderation.dto;

import br.com.unio.matchmaking_backend.moderation.entity.PitchPublicationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.Map;

/** D063: um envio de pitch na moderação de conteúdo (só ADMIN), com o conteúdo completo. */
public record PitchModerationItem(
        Long id,
        Long startupId,
        String startupName,
        String startupEmail,
        Integer version,
        PitchPublicationStatus status,
        @Schema(description = "Motivo da remoção; null nos outros casos") String reason,
        @Schema(description = "false quando a startup já mandou um envio mais novo; só o atual aceita ações")
        boolean current,
        Instant submittedAt,
        Instant reviewedAt,
        @Schema(description = "E-mail do administrador que decidiu") String reviewedBy,
        String shortPitch,
        String videoUrl,
        @Schema(description = "Os nove blocos do Lean Canvas") Map<String, String> leanCanvas
) {
}

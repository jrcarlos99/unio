package br.com.unio.matchmaking_backend.moderation.dto;

import br.com.unio.matchmaking_backend.moderation.entity.AccountModerationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** D063: uma conta na lista de moderação de cadastros (só ADMIN). */
public record AccountModerationItem(
        Long userId,
        String email,
        @Schema(example = "STARTUP") String role,
        @Schema(description = "Nome da startup; null para investidor ou startup sem perfil") String nome,
        @Schema(description = "Sem registro de moderação vale APROVADO") AccountModerationStatus status,
        @Schema(description = "Motivo da recusa ou da suspensão; null nos outros casos") String reason,
        @Schema(description = "E-mail do administrador que decidiu por último") String reviewedBy,
        Instant reviewedAt,
        @Schema(description = "Data de cadastro da conta") Instant createdAt,
        @Schema(description = "true quando o perfil de startup ou de investidor já foi criado") boolean profileComplete
) {
}

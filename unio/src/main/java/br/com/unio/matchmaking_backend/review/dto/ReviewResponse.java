package br.com.unio.matchmaking_backend.review.dto;

import br.com.unio.matchmaking_backend.communication.dto.ParticipantDto;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Avaliação devolvida a STARTUP e INVESTOR.
 *
 * <p>D043: o comentário NÃO faz parte desta resposta, nem para o autor nem para o avaliado.
 * Ele continua gravado em {@code interaction_reviews.comment} (finalidade: moderação e melhoria)
 * e só sai no export LGPD do próprio autor.</p>
 */
@Schema(description = "Avaliação de uma reunião realizada. Sem o comentário, que fica só no banco (D043).")
public record ReviewResponse(
        @Schema(example = "12") Long id,
        @Schema(example = "5") Long meetingId,
        ParticipantDto reviewer,
        ParticipantDto reviewed,
        @Schema(description = "Nota de 1 a 5", example = "4") int rating,
        Instant createdAt
) {
}

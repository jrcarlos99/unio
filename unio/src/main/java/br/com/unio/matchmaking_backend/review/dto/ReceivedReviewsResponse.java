package br.com.unio.matchmaking_backend.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Avaliações recebidas pelo usuário logado. Os itens não trazem o comentário (D043).
 *
 * @param averageRating média com uma casa decimal, ou null se ainda não há avaliações
 */
@Schema(description = "Avaliações recebidas pelo usuário logado, com a média. Sem comentários (D043).")
public record ReceivedReviewsResponse(
        @Schema(example = "4.3", nullable = true) Double averageRating,
        @Schema(example = "3") long totalReviews,
        List<ReviewResponse> reviews
) {
}

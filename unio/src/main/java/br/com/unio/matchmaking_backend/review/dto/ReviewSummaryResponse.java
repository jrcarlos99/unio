package br.com.unio.matchmaking_backend.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * D040: resumo público das avaliações recebidas por um usuário. Só agregados: sem
 * comentários, sem autores e sem notas individuais. Abaixo de
 * {@code ReviewService.MIN_REVIEWS_VISIBLE} avaliações, média e porcentagem são nulas.
 */
@Schema(description = "Resumo público das avaliações (só agregados, mínimo de 3 para exibir)")
public record ReviewSummaryResponse(
        @Schema(example = "42") Long userId,
        @Schema(description = "Quantidade de avaliações recebidas", example = "4") long totalReviews,
        @Schema(description = "Média com uma casa decimal; nula com menos de 3 avaliações",
                example = "4.5", nullable = true) Double averageRating,
        @Schema(description = "round(média / 5 * 100); nula com menos de 3 avaliações",
                example = "90", nullable = true) Integer percentage,
        @Schema(description = "true quando há pelo menos 3 avaliações", example = "true") boolean visible
) {
}

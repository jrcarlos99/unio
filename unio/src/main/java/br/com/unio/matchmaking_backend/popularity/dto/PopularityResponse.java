package br.com.unio.matchmaking_backend.popularity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * D042: popularidade do próprio usuário. O resumo público (D040) mais números que só o
 * dono vê. Nenhum campo identifica quem visitou ou quem avaliou.
 */
@Schema(description = "Popularidade do usuário logado (só agregados)")
public record PopularityResponse(
        @Schema(example = "42") Long userId,
        @Schema(example = "4") long totalReviews,
        @Schema(nullable = true, example = "4.5") Double averageRating,
        @Schema(nullable = true, example = "90") Integer percentage,
        @Schema(example = "true") boolean visible,
        @Schema(description = "Reuniões REALIZADAS em que o usuário participou", example = "4") long meetingsCompleted,
        @Schema(description = "Visitas nos últimos 28 dias (hoje incluso)", example = "59") long profileViews28d,
        @Schema(description = "Visitas nos 28 dias anteriores a esses", example = "50") long profileViewsPrev28d,
        @Schema(description = "4 janelas de 7 dias, da mais antiga para a mais recente") List<WeeklyViewsDto> weeklyViews,
        @Schema(description = "Sempre 0 por enquanto: o interesse mútuo ainda não existe no back (D039)",
                example = "0") long interestsReceived
) {
}

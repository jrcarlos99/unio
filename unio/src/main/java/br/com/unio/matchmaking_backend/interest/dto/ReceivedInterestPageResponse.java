package br.com.unio.matchmaking_backend.interest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** D065: página de GET /api/interests/received, do interesse mais recente para o mais antigo. */
@Schema(description = "Interesses recebidos e ainda não correspondidos, do mais recente para o mais antigo")
public record ReceivedInterestPageResponse(
        @Schema(description = "Total de interesses recebidos pendentes (todas as páginas)", example = "3") int total,
        @Schema(example = "20") int limit,
        @Schema(example = "0") int offset,
        List<ReceivedInterestResponse> items
) {
}

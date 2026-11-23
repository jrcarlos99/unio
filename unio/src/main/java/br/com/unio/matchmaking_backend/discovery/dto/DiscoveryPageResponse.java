package br.com.unio.matchmaking_backend.discovery.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** D045 e D046: página da descoberta, ordenada por score decrescente. */
@Schema(description = "Página da descoberta, ordenada por score decrescente")
public record DiscoveryPageResponse(
        @Schema(description = "Total de candidatos depois dos filtros (todas as páginas)", example = "14")
        int total,
        @Schema(example = "20") int limit,
        @Schema(example = "0") int offset,
        @Schema(description = "Candidatos sem score porque o limite de cálculos por requisição foi atingido "
                + "(unio.discovery.max-calculations-per-request). Aparecem nas próximas leituras.",
                example = "0")
        int notCalculated,
        List<DiscoveryItemResponse> items
) {
}

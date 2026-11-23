package br.com.unio.matchmaking_backend.popularity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "Visitas de uma janela de 7 dias")
public record WeeklyViewsDto(
        @Schema(description = "Primeiro dia da janela (fuso America/Recife)", example = "2026-10-20") LocalDate weekStart,
        @Schema(example = "14") long views
) {
}

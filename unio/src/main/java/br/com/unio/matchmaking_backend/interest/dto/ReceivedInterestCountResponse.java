package br.com.unio.matchmaking_backend.interest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** D065: contagem leve de GET /api/interests/received/count, para o sino do front. */
@Schema(description = "Quantos interesses recebidos ainda não foram correspondidos (o mesmo total da lista)")
public record ReceivedInterestCountResponse(@Schema(example = "3") long total) {
}

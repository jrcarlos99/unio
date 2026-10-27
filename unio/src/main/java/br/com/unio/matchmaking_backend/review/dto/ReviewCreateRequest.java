package br.com.unio.matchmaking_backend.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewCreateRequest(
        @NotNull(message = "A nota é obrigatória")
        @Min(value = 1, message = "A nota mínima é 1")
        @Max(value = 5, message = "A nota máxima é 5")
        Integer rating,

        @Size(max = 1000, message = "O comentário deve ter no máximo 1000 caracteres")
        String comment
) {
}

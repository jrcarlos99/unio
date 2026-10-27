package br.com.unio.matchmaking_backend.communication.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MessageCreateRequest(
        @NotBlank(message = "A mensagem não pode ser vazia")
        @Size(max = 2000, message = "A mensagem deve ter no máximo 2000 caracteres")
        String content
) {
}

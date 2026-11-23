package br.com.unio.matchmaking_backend.popularity.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Perfil que o usuário logado abriu")
public record ProfileViewRequest(
        @Schema(description = "userId do perfil visitado", example = "42")
        @NotNull(message = "Informe o perfil visitado")
        Long targetUserId
) {
}

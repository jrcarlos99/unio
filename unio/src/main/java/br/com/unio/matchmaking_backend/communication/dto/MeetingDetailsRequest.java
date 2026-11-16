package br.com.unio.matchmaking_backend.communication.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Atualização de link e local pelo organizador (D036). Campo ausente (null) fica
 * como está; {@code meetingUrl} vazio apaga o link.
 */
@Schema(description = "Link e/ou local da reunião (só o organizador)")
public record MeetingDetailsRequest(
        @Schema(description = "Link da sala, só https. Vazio apaga", example = "https://meet.google.com/abc-defg-hij",
                nullable = true)
        @Size(max = 500, message = "O link deve ter no máximo 500 caracteres")
        @Pattern(regexp = "^$|^https://\\S+$", message = "O link da reunião deve começar com https://")
        String meetingUrl,

        @Schema(description = "Local (só em reunião PRESENCIAL). Substitui o local inteiro", nullable = true)
        @Valid
        MeetingLocationDto location
) {
}

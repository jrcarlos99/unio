package br.com.unio.matchmaking_backend.communication.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/** Local de uma reunião PRESENCIAL (D035). */
@Schema(description = "Local da reunião presencial")
public record MeetingLocationDto(
        @Schema(example = "Porto Digital")
        @Size(max = 150, message = "O nome do local deve ter no máximo 150 caracteres")
        String name,

        @Schema(example = "Rua do Apolo, 181, Recife")
        @Size(max = 255, message = "O endereço deve ter no máximo 255 caracteres")
        String address,

        @Schema(example = "Sala 3, 2º andar", nullable = true)
        @Size(max = 255, message = "A referência deve ter no máximo 255 caracteres")
        String reference
) {
}

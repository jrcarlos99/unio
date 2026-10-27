package br.com.unio.matchmaking_backend.communication.dto;

import jakarta.validation.constraints.Size;

public record MeetingCancelRequest(
        @Size(max = 255, message = "O motivo deve ter no máximo 255 caracteres")
        String reason
) {
}

package br.com.unio.matchmaking_backend.communication.dto;

import java.time.Instant;

/**
 * Reunião vista pelo usuário logado.
 *
 * @param organizer   true se quem consulta propôs a reunião
 * @param participant o outro lado da reunião
 */
public record MeetingResponse(
        Long id,
        String title,
        String agenda,
        Instant startsAt,
        Instant endsAt,
        int durationMinutes,
        String meetingUrl,
        String status,
        String cancelReason,
        boolean organizer,
        ParticipantDto participant,
        Instant createdAt,
        Instant updatedAt
) {
}

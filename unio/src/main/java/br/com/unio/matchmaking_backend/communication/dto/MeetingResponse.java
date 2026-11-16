package br.com.unio.matchmaking_backend.communication.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

/**
 * Reunião vista pelo usuário logado. Os campos da T09b continuam iguais; os
 * novos (D032 a D035) vêm depois de {@code updatedAt}.
 *
 * @param organizer      true se quem consulta criou a reunião (só ele edita link e local)
 * @param participant    o outro lado da reunião
 * @param startsAt       PENDENTE: o primeiro horário sugerido; CONFIRMADA: o escolhido
 * @param suggestedTimes horários da proposta vigente, em ordem cronológica
 * @param proposedByMe   true se quem consulta fez a proposta vigente (numa PENDENTE, quem
 *                       responde é o outro lado)
 */
@Schema(description = "Reunião vista pelo usuário logado")
public record MeetingResponse(
        Long id,
        String title,
        String agenda,
        Instant startsAt,
        Instant endsAt,
        int durationMinutes,
        String meetingUrl,
        @Schema(allowableValues = {"PENDENTE", "CONFIRMADA", "RECUSADA", "CANCELADA", "REALIZADA"})
        String status,
        String cancelReason,
        @Schema(description = "true se quem consulta criou a reunião")
        boolean organizer,
        ParticipantDto participant,
        Instant createdAt,
        Instant updatedAt,
        @Schema(nullable = true, example = "Apresentação de pitch")
        String subject,
        @Schema(nullable = true)
        String message,
        @Schema(allowableValues = {"ONLINE", "PRESENCIAL"})
        String format,
        @Schema(nullable = true, description = "Só em PRESENCIAL, quando informado")
        MeetingLocationDto location,
        @Schema(description = "Horários da proposta vigente, em ordem cronológica")
        List<Instant> suggestedTimes,
        @Schema(description = "true se quem consulta fez a proposta vigente")
        boolean proposedByMe
) {
}

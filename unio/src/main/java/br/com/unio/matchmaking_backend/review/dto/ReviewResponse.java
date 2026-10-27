package br.com.unio.matchmaking_backend.review.dto;

import br.com.unio.matchmaking_backend.communication.dto.ParticipantDto;
import java.time.Instant;

public record ReviewResponse(
        Long id,
        Long meetingId,
        ParticipantDto reviewer,
        ParticipantDto reviewed,
        int rating,
        String comment,
        Instant createdAt
) {
}

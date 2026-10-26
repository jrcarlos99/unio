package br.com.unio.matchmaking_backend.consent.dto;

import br.com.unio.matchmaking_backend.consent.entity.ConsentRecord;
import java.time.Instant;

public record ConsentResponse(Long id, Instant acceptedAt, Instant revokedAt) {

    public static ConsentResponse from(ConsentRecord consentRecord) {
        return new ConsentResponse(
                consentRecord.getId(),
                consentRecord.getAcceptedAt(),
                consentRecord.getRevokedAt());
    }
}

package br.com.unio.matchmaking_backend.consent.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.consent.dto.ConsentResponse;
import br.com.unio.matchmaking_backend.consent.entity.ConsentRecord;
import br.com.unio.matchmaking_backend.consent.repository.ConsentRecordRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/consent")
@RequiredArgsConstructor
public class ConsentController {

    private final ConsentRecordRepository consentRecordRepository;

    @GetMapping("/me")
    public ConsentResponse getMyConsent(@AuthenticationPrincipal AuthUser authUser) {
        return ConsentResponse.from(findConsent(authUser));
    }

    @PostMapping("/revoke")
    public ResponseEntity<ConsentResponse> revokeConsent(@AuthenticationPrincipal AuthUser authUser) {
        ConsentRecord consentRecord = findConsent(authUser);
        if (consentRecord.getRevokedAt() == null) {
            consentRecord.setRevokedAt(Instant.now());
            consentRecord = consentRecordRepository.save(consentRecord);
        }
        return ResponseEntity.ok(ConsentResponse.from(consentRecord));
    }

    private ConsentRecord findConsent(AuthUser authUser) {
        return consentRecordRepository.findByUserId(authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Consentimento não encontrado"));
    }
}

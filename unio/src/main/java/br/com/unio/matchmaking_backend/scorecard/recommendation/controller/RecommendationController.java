package br.com.unio.matchmaking_backend.scorecard.recommendation.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.scorecard.recommendation.dto.RecommendedInvestorDto;
import br.com.unio.matchmaking_backend.scorecard.recommendation.dto.RecommendedStartupDto;
import br.com.unio.matchmaking_backend.scorecard.recommendation.service.RecommendationService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/scorecard")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/recommendations")
    @PreAuthorize("hasAnyRole('INVESTOR', 'ADMIN')")
    public ResponseEntity<List<RecommendedStartupDto>> recommendations(
            Authentication authentication,
            @RequestParam(defaultValue = "20") int limit
    ) {
        UUID investorId = extractUserIdAsUuid(authentication);
        return ResponseEntity.ok(recommendationService.recommend(investorId, limit));
    }

    @GetMapping("/recommendations/investors")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    public ResponseEntity<List<RecommendedInvestorDto>> recommendationsForStartup(
            Authentication authentication,
            @RequestParam(defaultValue = "20") int limit
    ) {
        UUID startupId = extractUserIdAsUuid(authentication);
        return ResponseEntity.ok(recommendationService.recommendInvestors(startupId, limit));
    }

    private UUID extractUserIdAsUuid(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof AuthUser authUser)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não autenticado");
        }

        return new UUID(0L, authUser.getId());
    }
}
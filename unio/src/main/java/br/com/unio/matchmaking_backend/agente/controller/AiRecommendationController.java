package br.com.unio.matchmaking_backend.agente.controller;

import br.com.unio.matchmaking_backend.agente.dto.AiRecommendationResponse;
import br.com.unio.matchmaking_backend.agente.service.AiRecommendationService;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agente")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STARTUP','INVESTOR')")
public class AiRecommendationController {

    private final AiRecommendationService aiRecommendationService;

    @GetMapping("/recommendations")
    public ResponseEntity<AiRecommendationResponse> recommendations(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(aiRecommendationService.recommend(user, limit));
    }
}

package br.com.unio.matchmaking_backend.matching.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.matching.dto.MatchCriteriaWeightRequest;
import br.com.unio.matchmaking_backend.matching.dto.SwipeRequest;
import br.com.unio.matchmaking_backend.matching.service.MatchingService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingService matchingService;

    @GetMapping("/criteria-weights")
    public ResponseEntity<List<Map<String, Object>>> getCriteriaWeights() {
        return ResponseEntity.ok(matchingService.getCriteriaWeights());
    }

    @PutMapping("/criteria-weights")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> updateCriteriaWeights(
        @Valid @RequestBody List<MatchCriteriaWeightRequest> requests
    ) {
        return ResponseEntity.ok(matchingService.updateCriteriaWeights(requests));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<Map<String, Object>>> getRecommendations(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(matchingService.getRecommendations(authUser));
    }

    @PostMapping("/swipe")
    public ResponseEntity<Map<String, Object>> swipe(
        @AuthenticationPrincipal AuthUser authUser,
        @Valid @RequestBody SwipeRequest request
    ) {
        return ResponseEntity.ok(matchingService.swipe(authUser, request));
    }

    @GetMapping("/mutual")
    public ResponseEntity<List<Map<String, Object>>> getMutualMatches(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(matchingService.getMutualMatches(authUser));
    }
}

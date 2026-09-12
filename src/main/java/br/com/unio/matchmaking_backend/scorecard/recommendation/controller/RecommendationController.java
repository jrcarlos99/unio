package br.com.unio.matchmaking_backend.scorecard.recommendation.controller;

import br.com.unio.matchmaking_backend.scorecard.recommendation.dto.RecommendedStartupDto;
import br.com.unio.matchmaking_backend.scorecard.recommendation.service.RecommendationService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scorecard")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/recommendations")
    @PreAuthorize("hasAnyRole('INVESTOR', 'ADMIN')")
    public ResponseEntity<List<RecommendedStartupDto>> recommendations(
            @RequestParam UUID investorId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(recommendationService.recommend(investorId, limit));
    }
}
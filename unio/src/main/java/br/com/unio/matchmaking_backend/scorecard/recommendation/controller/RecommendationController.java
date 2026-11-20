package br.com.unio.matchmaking_backend.scorecard.recommendation.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.scorecard.common.ScorecardAccess;
import br.com.unio.matchmaking_backend.scorecard.recommendation.dto.RecommendedStartupDto;
import br.com.unio.matchmaking_backend.scorecard.recommendation.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scorecard")
@RequiredArgsConstructor
@Tag(name = "Scorecard", description = "Score de compatibilidade startup x investidor")
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/recommendations")
    @PreAuthorize("hasAnyRole('INVESTOR', 'ADMIN')")
    @Operation(summary = "Startups com score já calculado para um investidor",
            description = "D048: o investorId precisa ser o do investidor logado (ADMIN consulta qualquer um). "
                    + "Só lê scores já gravados; a lista com cálculo sob demanda é GET /api/discovery/startups.")
    public ResponseEntity<List<RecommendedStartupDto>> recommendations(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam UUID investorId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        ScorecardAccess.requireOwnInvestor(authUser, investorId);
        return ResponseEntity.ok(recommendationService.recommend(investorId, limit));
    }
}

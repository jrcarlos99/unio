package br.com.unio.matchmaking_backend.scorecard.recommendation.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.scorecard.common.ScorecardAccess;
import br.com.unio.matchmaking_backend.scorecard.recommendation.dto.RecommendedInvestorDto;
import br.com.unio.matchmaking_backend.scorecard.recommendation.dto.RecommendedStartupDto;
import br.com.unio.matchmaking_backend.scorecard.recommendation.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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

/**
 * D061: uma regra só de acesso (ScorecardAccess.resolveOwnSide), que junta a D048 e a
 * correção de IDOR do main (T20). O id na query é opcional: sem ele vale o usuário logado;
 * com ele, precisa ser o próprio usuário (ADMIN consulta qualquer um).
 */
@RestController
@RequestMapping("/api/scorecard")
@RequiredArgsConstructor
@Tag(name = "Scorecard", description = "Score de compatibilidade startup x investidor")
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/recommendations")
    @PreAuthorize("hasAnyRole('INVESTOR', 'ADMIN')")
    @Operation(summary = "Startups com score já calculado para um investidor",
            description = "D048, T20 e D061: sem investorId, usa o investidor logado; com investorId, ele "
                    + "precisa ser o do investidor logado (ADMIN consulta qualquer um), senão 403. Só lê "
                    + "scores já gravados; a lista com cálculo sob demanda é GET /api/discovery/startups.")
    public ResponseEntity<List<RecommendedStartupDto>> recommendations(
            @AuthenticationPrincipal AuthUser authUser,
            @Parameter(description = "Opcional. UUID \"Long-encoded\" do investidor (D018)")
            @RequestParam(required = false) UUID investorId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        UUID ownInvestorId = ScorecardAccess.resolveOwnSide(authUser, investorId);
        return ResponseEntity.ok(recommendationService.recommend(ownInvestorId, limit));
    }

    @GetMapping("/recommendations/investors")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Investidores com score já calculado para uma startup",
            description = "T20 e D061: sem startupId, usa a startup logada; com startupId, ele precisa ser o "
                    + "da startup logada (ADMIN consulta qualquer uma), senão 403. investorEmail só vem "
                    + "quando há match mútuo com o investidor (D052); senão é null. A lista com cálculo "
                    + "sob demanda é GET /api/discovery/investors.")
    public ResponseEntity<List<RecommendedInvestorDto>> recommendationsForStartup(
            @AuthenticationPrincipal AuthUser authUser,
            @Parameter(description = "Opcional. UUID \"Long-encoded\" da startup (D018)")
            @RequestParam(required = false) UUID startupId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        UUID ownStartupId = ScorecardAccess.resolveOwnSide(authUser, startupId);
        return ResponseEntity.ok(recommendationService.recommendInvestors(ownStartupId, limit));
    }
}

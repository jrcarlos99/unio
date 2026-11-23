package br.com.unio.matchmaking_backend.scorecard.explanation.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.common.ScorecardAccess;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.MatchScoreExplanationResponse;
import br.com.unio.matchmaking_backend.scorecard.explanation.service.ExplanationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Comparator;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/scorecard")
@RequiredArgsConstructor
@Tag(name = "Scorecard", description = "Score de compatibilidade startup x investidor")
public class ExplanationController {

    private final MatchScoreRepository matchScoreRepository;
    private final ExplanationService explanationService;

    @GetMapping("/{startupId}/explanation")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Explicação de um score já calculado",
            description = "D048: o investidor só consulta pares em que é o investorId; a startup, pares em que "
                    + "é o startupId; ADMIN, qualquer par. Outro par: 403.")
    public ResponseEntity<MatchScoreExplanationResponse> explanation(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable UUID startupId,
            @RequestParam(required = false) UUID investorId
    ) {
        if (investorId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "investorId é obrigatório");
        }
        ScorecardAccess.requireOwnPair(authUser, startupId, investorId);

        // Pode haver um score por política (D047): vale o mais recente
        MatchScore matchScore = matchScoreRepository
                .findAllByInvestorIdAndStartupId(investorId, startupId)
                .stream()
                .max(Comparator.comparing(MatchScore::getCalculatedAt,
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Score não calculado para este par"));

        MatchScoreExplanationResponse response =
                explanationService.buildExplanation(matchScore);

        return ResponseEntity.ok(response);
    }
}

package br.com.unio.matchmaking_backend.scorecard.explanation.controller;

import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.MatchScoreExplanationResponse;
import br.com.unio.matchmaking_backend.scorecard.explanation.service.ExplanationService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/scorecard")
@RequiredArgsConstructor
public class ExplanationController {

    private final MatchScoreRepository matchScoreRepository;
    private final ExplanationService explanationService;

    @GetMapping("/{startupId}/explanation")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MatchScoreExplanationResponse> explanation(
            @PathVariable UUID startupId,
            @RequestParam(required = false) UUID investorId
    ) {
        if (investorId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "investorId é obrigatório");
        }

        MatchScore matchScore = matchScoreRepository
                .findByInvestorIdAndStartupId(investorId, startupId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Score não calculado para este par"));

        MatchScoreExplanationResponse response =
                explanationService.buildExplanation(matchScore);

        return ResponseEntity.ok(response);
    }
}
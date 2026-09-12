package br.com.unio.matchmaking_backend.scorecard.calculation.controller;

import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.CalculateRequest;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.CalculateResponse;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.ScorePersistenceResult;
import br.com.unio.matchmaking_backend.scorecard.calculation.service.ScorePersistenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/scorecard")
@RequiredArgsConstructor
public class ScorecardCalculationController {

    private final ScorePersistenceService scorePersistenceService;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;

    @PostMapping("/calculate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CalculateResponse> calculate(
            @Valid @RequestBody CalculateRequest request
    ) {
        Startup startup = startupRepository.findById(request.getStartupId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Startup não encontrada"));

        Investor investor = investorRepository.findById(request.getInvestorId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Investidor não encontrado"));

        ScorePersistenceResult result = scorePersistenceService
                .calculateAndPersist(startup, investor);

        MatchScore ms = result.getMatchScore();

        CalculateResponse response = CalculateResponse.builder()
                .matchScoreId(ms.getId())
                .startupId(ms.getStartupId())
                .investorId(ms.getInvestorId())
                .scorePolicyId(ms.getScorePolicy().getId())
                .scoreFinal(ms.getTotalScore())
                .classification(ms.getClassification())
                .recalculated(result.isRecalculated())
                .calculatedAt(ms.getCalculatedAt())
                .build();

        return ResponseEntity.status(result.isRecalculated()
                ? HttpStatus.OK
                : HttpStatus.CREATED).body(response);
    }
}
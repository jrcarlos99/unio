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
import java.util.UUID;
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
        Long startupIdLong = toLong(request.getStartupId());
        Long investorIdLong = toLong(request.getInvestorId());

        Startup startup = startupRepository.findById(startupIdLong)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Startup não encontrada"));

        Investor investor = investorRepository.findById(investorIdLong)
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

    /**
     * Converte um UUID "Long-encoded" (new UUID(0L, id)) de volta para Long.
     */
    private Long toLong(UUID uuid) {
        if (uuid == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "UUID é obrigatório");
        }
        long msb = uuid.getMostSignificantBits();
        long lsb = uuid.getLeastSignificantBits();
        if (msb != 0L) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "UUID não corresponde a um ID de entidade");
        }
        return lsb;
    }
}
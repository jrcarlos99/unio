package br.com.unio.matchmaking_backend.scorecard.policy.controller;

import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import br.com.unio.matchmaking_backend.scorecard.common.exception.PolicyNotFoundException;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import br.com.unio.matchmaking_backend.scorecard.policy.dto.ScorePolicyCreateRequest;
import br.com.unio.matchmaking_backend.scorecard.policy.dto.ScorePolicyResponse;
import br.com.unio.matchmaking_backend.scorecard.policy.service.ScorePolicyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/policies")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ScorePolicyController {

    private final ScorePolicyService scorePolicyService;

    @PostMapping
    public ResponseEntity<ScorePolicyResponse> create(@Valid @RequestBody ScorePolicyCreateRequest request) {
        ScorePolicy created = scorePolicyService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    @GetMapping("/current")
    public ResponseEntity<ScorePolicyResponse> getCurrent(
        @RequestParam InvestorProfileType investorProfileType
    ) {
        ScorePolicy activePolicy = scorePolicyService.findActiveByProfileType(investorProfileType)
            .orElseThrow(() -> new PolicyNotFoundException("POLICY_NOT_FOUND"));
        return ResponseEntity.ok(toResponse(activePolicy));
    }

    private ScorePolicyResponse toResponse(ScorePolicy scorePolicy) {
        return ScorePolicyResponse.builder()
            .id(scorePolicy.getId())
            .investorProfileType(scorePolicy.getInvestorProfileType())
            .version(scorePolicy.getVersion())
            .active(scorePolicy.isActive())
            .name(scorePolicy.getName())
            .createdAt(scorePolicy.getCreatedAt())
            .build();
    }
}

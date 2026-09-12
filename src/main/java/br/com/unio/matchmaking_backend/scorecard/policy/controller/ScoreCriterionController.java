package br.com.unio.matchmaking_backend.scorecard.policy.controller;

import br.com.unio.matchmaking_backend.scorecard.policy.ScoreCriterion;
import br.com.unio.matchmaking_backend.scorecard.policy.dto.ScoreCriterionCreateRequest;
import br.com.unio.matchmaking_backend.scorecard.policy.dto.ScoreCriterionResponse;
import br.com.unio.matchmaking_backend.scorecard.policy.dto.ScoreCriterionUpdateRequest;
import br.com.unio.matchmaking_backend.scorecard.policy.service.ScoreCriterionService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ScoreCriterionController {

    private final ScoreCriterionService scoreCriterionService;

    @PostMapping("/policies/{policyId}/criteria")
    public ResponseEntity<ScoreCriterionResponse> create(
            @PathVariable Long policyId,
            @Valid @RequestBody ScoreCriterionCreateRequest request
    ) {
        ScoreCriterion created = scoreCriterionService.create(policyId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    @GetMapping("/policies/{policyId}/criteria")
    public ResponseEntity<List<ScoreCriterionResponse>> listByPolicy(@PathVariable Long policyId) {
        List<ScoreCriterionResponse> response = scoreCriterionService.findByPolicy(policyId)
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/criteria/{criterionId}")
    public ResponseEntity<ScoreCriterionResponse> update(
            @PathVariable Long criterionId,
            @Valid @RequestBody ScoreCriterionUpdateRequest request
    ) {
        ScoreCriterion updated = scoreCriterionService.update(criterionId, request);
        return ResponseEntity.ok(toResponse(updated));
    }

    @DeleteMapping("/criteria/{criterionId}")
    public ResponseEntity<Void> deactivate(@PathVariable Long criterionId) {
        scoreCriterionService.deactivate(criterionId);
        return ResponseEntity.noContent().build();
    }

    private ScoreCriterionResponse toResponse(ScoreCriterion criterion) {
        return ScoreCriterionResponse.builder()
                .id(criterion.getId())
                .scorePolicyId(criterion.getScorePolicy().getId())
                .code(criterion.getCode())
                .label(criterion.getLabel())
                .dimension(criterion.getDimension())
                .weight(criterion.getWeight())
                .criticality(criterion.getCriticality())
                .active(criterion.isActive())
                .build();
    }
}
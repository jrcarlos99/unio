package br.com.unio.matchmaking_backend.scorecard.feedback.controller;

import br.com.unio.matchmaking_backend.scorecard.common.exception.CriticalCriterionViolatedException;
import br.com.unio.matchmaking_backend.scorecard.feedback.FeedbackEvent;
import br.com.unio.matchmaking_backend.scorecard.feedback.FeedbackEventRepository;
import br.com.unio.matchmaking_backend.scorecard.feedback.dto.FeedbackCreateRequest;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicyRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
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
public class FeedbackController {

    private final FeedbackEventRepository feedbackEventRepository;
    private final ScorePolicyRepository scorePolicyRepository;

    @PostMapping("/feedback")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FeedbackEvent> create(
            @Valid @RequestBody FeedbackCreateRequest request
    ) {
        ScorePolicy policy = scorePolicyRepository.findById(request.getScorePolicyId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Policy não encontrada"));

        Instant fiveMinutesAgo = Instant.now().minus(5, ChronoUnit.MINUTES);
        List<FeedbackEvent> duplicates = feedbackEventRepository
                .findByInvestorIdAndStartupIdAndScorePolicyIdAndActionAndCreatedAtAfter(
                        request.getInvestorId(),
                        request.getStartupId(),
                        request.getScorePolicyId(),
                        request.getAction(),
                        fiveMinutesAgo
                );

        if (!duplicates.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "FEEDBACK_DUPLICATE");
        }

        FeedbackEvent event = FeedbackEvent.builder()
                .investorId(request.getInvestorId())
                .startupId(request.getStartupId())
                .scorePolicy(policy)
                .action(request.getAction())
                .createdAt(Instant.now())
                .build();

        FeedbackEvent saved = feedbackEventRepository.save(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
package br.com.unio.matchmaking_backend.scorecard.recommendation.service;

import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.MatchScoreExplanationResponse;
import br.com.unio.matchmaking_backend.scorecard.explanation.service.ExplanationService;
import br.com.unio.matchmaking_backend.scorecard.recommendation.dto.RecommendedStartupDto;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final MatchScoreRepository matchScoreRepository;
    private final StartupRepository startupRepository;
    private final ExplanationService explanationService;

    public List<RecommendedStartupDto> recommend(UUID investorId, int limit) {
        List<MatchScore> scores = matchScoreRepository.findByInvestorId(investorId);

        return scores.stream()
                .sorted(Comparator.comparing(MatchScore::getTotalScore).reversed())
                .limit(limit)
                .map(this::toRecommendedStartup)
                .toList();
    }

    private RecommendedStartupDto toRecommendedStartup(MatchScore score) {
        MatchScoreExplanationResponse explanation = explanationService.buildExplanation(score);
        String startupName = resolveStartupName(score.getStartupId());

        return RecommendedStartupDto.builder()
                .startupId(score.getStartupId())
                .startupName(startupName)
                .scoreFinal(explanation.getScoreFinal())
                .classification(explanation.getClassification())
                .dimensions(explanation.getDimensions())
                .topPositiveFactors(explanation.getTopPositiveFactors())
                .topAttentionFactors(explanation.getTopAttentionFactors())
                .nextStep(explanation.getNextStep())
                .build();
    }

    private String resolveStartupName(UUID startupId) {
        if (startupId == null) return "unknown";
        return startupRepository.findById(startupId.getLeastSignificantBits())
                .map(Startup::getSegmento)
                .orElse(startupId.toString());
    }
}
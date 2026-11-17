package br.com.unio.matchmaking_backend.scorecard.recommendation.service;

import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.MatchScoreExplanationResponse;
import br.com.unio.matchmaking_backend.scorecard.explanation.service.ExplanationService;
import br.com.unio.matchmaking_backend.scorecard.recommendation.dto.RecommendedInvestorDto;
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
    private final InvestorRepository investorRepository;
    private final ExplanationService explanationService;

    public List<RecommendedStartupDto> recommend(UUID investorId, int limit) {
        List<MatchScore> scores = matchScoreRepository.findByInvestorId(investorId);

        return scores.stream()
                .sorted(Comparator.comparing(MatchScore::getTotalScore).reversed())
                .limit(limit)
                .map(this::toRecommendedStartup)
                .toList();
    }

    public List<RecommendedInvestorDto> recommendInvestors(UUID startupId, int limit) {
        List<MatchScore> scores = matchScoreRepository.findByStartupId(startupId);

        return scores.stream()
                .sorted(Comparator.comparing(MatchScore::getTotalScore).reversed())
                .limit(limit)
                .map(this::toRecommendedInvestor)
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

    private RecommendedInvestorDto toRecommendedInvestor(MatchScore score) {
        Long realInvestorId = score.getInvestorId().getLeastSignificantBits();

        String email = investorRepository.findById(realInvestorId)
                .map(Investor::getUser)
                .map(User::getEmail)
                .orElse("investidor-desconhecido@unio.com");

        return new RecommendedInvestorDto(
                score.getInvestorId(),
                email,
                score.getTotalScore()
        );
    }

    private String resolveStartupName(UUID startupId) {
        if (startupId == null) return "unknown";
        return startupRepository.findById(startupId.getLeastSignificantBits())
                .map(Startup::getNome)
                .orElse(startupId.toString());
    }
}
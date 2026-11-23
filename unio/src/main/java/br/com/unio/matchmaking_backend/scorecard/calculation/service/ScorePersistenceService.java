package br.com.unio.matchmaking_backend.scorecard.calculation.service;

import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.CriterionEvaluation;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.ScoreCalculationResult;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.ScorePersistenceResult;
import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreFactorType;
import br.com.unio.matchmaking_backend.scorecard.common.exception.CriticalCriterionViolatedException;
import br.com.unio.matchmaking_backend.scorecard.common.exception.PolicyNotFoundException;
import br.com.unio.matchmaking_backend.scorecard.explanation.MatchScoreFactor;
import br.com.unio.matchmaking_backend.scorecard.explanation.MatchScoreFactorRepository;
import br.com.unio.matchmaking_backend.scorecard.policy.ScoreCriterionRepository;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicyRepository;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScorePersistenceService {

    private final ScoreCalculatorService scoreCalculatorService;
    private final ScorePolicyRepository scorePolicyRepository;
    private final ScoreCriterionRepository scoreCriterionRepository;
    private final MatchScoreRepository matchScoreRepository;
    private final MatchScoreFactorRepository matchScoreFactorRepository;

    @Transactional
    public ScorePersistenceResult calculateAndPersist(Startup startup, Investor investor) {
        ScorePolicy policy = resolvePolicy(investor);

        ScoreCalculationResult result = scoreCalculatorService.calculate(startup, investor, policy);

        if (result.isCriticalViolation()) {
            throw new CriticalCriterionViolatedException("CRITICAL_CRITERION_VIOLATED");
        }

        UUID investorUuid = toUuid(investor.getId());
        UUID startupUuid = toUuid(startup.getId());

        Optional<MatchScore> existing = matchScoreRepository
                .findByInvestorIdAndStartupIdAndScorePolicyId(investorUuid, startupUuid, policy.getId());

        boolean recalculated = existing.isPresent();

        MatchScore matchScore = existing.orElseGet(() -> MatchScore.builder()
                .investorId(investorUuid)
                .startupId(startupUuid)
                .scorePolicy(policy)
                .build());

        matchScore.setTotalScore(result.getTotalScore());
        matchScore.setClassification(result.getClassification());
        matchScore.setCalculatedAt(Instant.now());

        MatchScore savedMatchScore = matchScoreRepository.save(matchScore);

        if (recalculated) {
            List<MatchScoreFactor> oldFactors = matchScoreFactorRepository
                    .findByMatchScoreIdOrderByTypeAscRankAsc(savedMatchScore.getId());
            matchScoreFactorRepository.deleteAll(oldFactors);
        }

        List<MatchScoreFactor> factors = buildFactors(savedMatchScore, result);
        matchScoreFactorRepository.saveAll(factors);

        return ScorePersistenceResult.builder()
                .matchScore(savedMatchScore)
                .factors(factors)
                .recalculated(recalculated)
                .build();
    }

    private List<MatchScoreFactor> buildFactors(
            MatchScore matchScore,
            ScoreCalculationResult result
    ) {
        List<CriterionEvaluation> evaluations = result.getCriterionEvaluations();
        List<MatchScoreFactor> factors = new ArrayList<>();

        // Separa todos em POSITIVE e ATTENTION, ordena por score.
        List<CriterionEvaluation> positives = evaluations.stream()
                .filter(e -> e.getAdjustedScore().compareTo(new BigDecimal("70")) >= 0)
                .sorted(Comparator.comparing(CriterionEvaluation::getAdjustedScore).reversed())
                .toList();

        List<CriterionEvaluation> attentions = evaluations.stream()
                .filter(e -> e.getAdjustedScore().compareTo(new BigDecimal("70")) < 0)
                .sorted(Comparator.comparing(CriterionEvaluation::getAdjustedScore))
                .toList();

        factors.addAll(toFactors(matchScore, positives, MatchScoreFactorType.POSITIVE));
        factors.addAll(toFactors(matchScore, attentions, MatchScoreFactorType.ATTENTION));

        return factors;
    }

    private List<MatchScoreFactor> toFactors(
            MatchScore matchScore,
            List<CriterionEvaluation> evaluations,
            MatchScoreFactorType type
    ) {
        List<MatchScoreFactor> factors = new ArrayList<>();
        int rank = 1;
        for (CriterionEvaluation evaluation : evaluations) {
            factors.add(MatchScoreFactor.builder()
                    .matchScore(matchScore)
                    .dimension(evaluation.getDimension())
                    .type(type)
                    .rank(rank++)
                    .factorCode(evaluation.getCode())
                    .factorLabel(evaluation.getCode())
                    .factorScore(evaluation.getAdjustedScore())
                    .weightApplied(evaluation.getWeight())
                    .explanation(evaluation.getExplanation())
                    .build());
        }
        return factors;
    }

    private UUID toUuid(Long id) {
        return id == null ? null : new UUID(0L, id);
    }

    /**
     * D047: política ativa do tipo do investidor. Se esse tipo não tiver política
     * ativa, usa a de ANGEL_INVESTOR; sem nenhuma das duas, POLICY_NOT_FOUND.
     */
    public ScorePolicy resolvePolicy(Investor investor) {
        InvestorProfileType type = mapToProfileType(investor.getPerfilRisco());
        return scorePolicyRepository.findByInvestorProfileTypeAndActiveTrue(type)
                .or(() -> scorePolicyRepository.findByInvestorProfileTypeAndActiveTrue(InvestorProfileType.ANGEL_INVESTOR))
                .orElseThrow(() -> new PolicyNotFoundException("POLICY_NOT_FOUND"));
    }

    /**
     * D047: tipo de política pelo perfilRisco do cadastro. "Mentor" vira MENTOR;
     * "Capital de risco" ou "Venture capital" vira VENTURE_CAPITAL; qualquer outro
     * valor ("Investidor Anjo", "Ambos"), nulo ou em branco vira ANGEL_INVESTOR.
     */
    public static InvestorProfileType mapToProfileType(String perfilRisco) {
        if (perfilRisco == null || perfilRisco.isBlank()) {
            return InvestorProfileType.ANGEL_INVESTOR;
        }
        String normalized = Normalizer.normalize(perfilRisco, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("\\s+", " ");
        return switch (normalized) {
            case "mentor" -> InvestorProfileType.MENTOR;
            case "capital de risco", "venture capital" -> InvestorProfileType.VENTURE_CAPITAL;
            default -> InvestorProfileType.ANGEL_INVESTOR;
        };
    }
}
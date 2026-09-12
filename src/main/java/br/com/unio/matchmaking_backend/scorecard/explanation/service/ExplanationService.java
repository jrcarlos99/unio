package br.com.unio.matchmaking_backend.scorecard.explanation.service;

import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreFactorType;
import br.com.unio.matchmaking_backend.scorecard.common.ScoreDimension;
import br.com.unio.matchmaking_backend.scorecard.explanation.MatchScoreFactor;
import br.com.unio.matchmaking_backend.scorecard.explanation.MatchScoreFactorRepository;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.DimensionBreakdownDto;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.FactorDto;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.MatchScoreExplanationResponse;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.NextStepDto;
import br.com.unio.matchmaking_backend.scorecard.policy.ScoreCriterion;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ExplanationService {

    private final MatchScoreFactorRepository matchScoreFactorRepository;

    public MatchScoreExplanationResponse buildExplanation(MatchScore matchScore) {
        List<MatchScoreFactor> factors = matchScoreFactorRepository
                .findByMatchScoreIdOrderByTypeAscRankAsc(matchScore.getId());

        List<ScoreCriterion> activeCriteria = matchScore.getScorePolicy().getCriteria() == null
                ? List.of()
                : matchScore.getScorePolicy().getCriteria().stream()
                .filter(ScoreCriterion::isActive)
                .toList();

        List<FactorDto> positives = factors.stream()
                .filter(f -> f.getType() == MatchScoreFactorType.POSITIVE)
                .map(this::toFactorDto)
                .toList();

        List<FactorDto> attentions = factors.stream()
                .filter(f -> f.getType() == MatchScoreFactorType.ATTENTION)
                .map(this::toFactorDto)
                .toList();

        List<DimensionBreakdownDto> dimensions = buildDimensions(activeCriteria, factors);
        NextStepDto nextStep = buildNextStep(attentions);

        return MatchScoreExplanationResponse.builder()
                .startupId(matchScore.getStartupId())
                .investorId(matchScore.getInvestorId())
                .scorePolicyId(matchScore.getScorePolicy().getId())
                .scoreFinal(matchScore.getTotalScore())
                .classification(matchScore.getClassification())
                .dimensions(dimensions)
                .topPositiveFactors(positives)
                .topAttentionFactors(attentions)
                .nextStep(nextStep)
                .calculatedAt(matchScore.getCalculatedAt())
                .build();
    }

    private List<DimensionBreakdownDto> buildDimensions(
            List<ScoreCriterion> activeCriteria,
            List<MatchScoreFactor> factors
    ) {
        Map<ScoreDimension, List<ScoreCriterion>> criteriaByDimension = new LinkedHashMap<>();
        for (ScoreCriterion criterion : activeCriteria) {
            criteriaByDimension
                    .computeIfAbsent(criterion.getDimension(), k -> new ArrayList<>())
                    .add(criterion);
        }

        Map<ScoreDimension, List<MatchScoreFactor>> factorsByDimension = new LinkedHashMap<>();
        for (MatchScoreFactor factor : factors) {
            factorsByDimension
                    .computeIfAbsent(factor.getDimension(), k -> new ArrayList<>())
                    .add(factor);
        }

        List<DimensionBreakdownDto> result = new ArrayList<>();
        for (var entry : criteriaByDimension.entrySet()) {
            ScoreDimension dimension = entry.getKey();
            List<ScoreCriterion> criteria = entry.getValue();

            BigDecimal realWeight = criteria.stream()
                    .map(ScoreCriterion::getWeight)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(4, RoundingMode.HALF_UP);

            List<MatchScoreFactor> dimensionFactors = factorsByDimension
                    .getOrDefault(dimension, List.of());

            BigDecimal score;
            if (dimensionFactors.isEmpty()) {
                score = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            } else {
                BigDecimal sum = dimensionFactors.stream()
                        .map(MatchScoreFactor::getFactorScore)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                score = sum.divide(
                        BigDecimal.valueOf(dimensionFactors.size()),
                        2,
                        RoundingMode.HALF_UP
                );
            }

            BigDecimal weightedScore = score
                    .multiply(realWeight)
                    .setScale(2, RoundingMode.HALF_UP);

            result.add(DimensionBreakdownDto.builder()
                    .dimension(dimension)
                    .score(score)
                    .weight(realWeight)
                    .weightedScore(weightedScore)
                    .build());
        }
        return result;
    }

    private NextStepDto buildNextStep(List<FactorDto> attentions) {
        if (attentions.isEmpty()) {
            return NextStepDto.builder()
                    .code("NO_ACTION_NEEDED")
                    .text("Nenhum ponto de atenção identificado.")
                    .build();
        }

        FactorDto worst = attentions.get(0);
        return switch (worst.getFactorCode()) {
            case "CAPITAL_FIT" -> NextStepDto.builder()
                    .code("REVIEW_CAPITAL_FIT")
                    .text("Revisar alinhamento entre capital procurado e ticket do investidor.")
                    .build();
            case "ESTAGIO_FIT" -> NextStepDto.builder()
                    .code("REVIEW_ESTAGIO_FIT")
                    .text("Revisar compatibilidade de estágio da startup com o perfil do investidor.")
                    .build();
            case "SEGMENTO_MATCH" -> NextStepDto.builder()
                    .code("REVIEW_SEGMENTO_MATCH")
                    .text("Revisar alinhamento de segmento entre startup e tese do investidor.")
                    .build();
            case "REGIAO_FIT" -> NextStepDto.builder()
                    .code("REVIEW_REGIAO_FIT")
                    .text("Revisar compatibilidade geográfica entre startup e investidor.")
                    .build();
            default -> NextStepDto.builder()
                    .code("GENERIC_REVIEW")
                    .text("Revisar os fatores de atenção identificados.")
                    .build();
        };
    }

    private FactorDto toFactorDto(MatchScoreFactor factor) {
        return FactorDto.builder()
                .type(factor.getType())
                .rank(factor.getRank())
                .dimension(factor.getDimension())
                .factorCode(factor.getFactorCode())
                .factorLabel(factor.getFactorLabel())
                .factorScore(factor.getFactorScore())
                .weightApplied(factor.getWeightApplied())
                .explanation(factor.getExplanation())
                .build();
    }
}
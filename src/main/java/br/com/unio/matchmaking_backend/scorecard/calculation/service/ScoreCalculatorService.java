package br.com.unio.matchmaking_backend.scorecard.calculation.service;

import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.CriterionEvaluation;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.ScoreCalculationResult;
import br.com.unio.matchmaking_backend.scorecard.common.CriticalityLevel;
import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
import br.com.unio.matchmaking_backend.scorecard.common.ScoreDimension;
import br.com.unio.matchmaking_backend.scorecard.policy.ScoreCriterion;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ScoreCalculatorService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final BigDecimal FIFTY = new BigDecimal("50");
    private static final BigDecimal HIGH_PENALTY = new BigDecimal("0.70");
    private static final BigDecimal MEDIUM_PENALTY = new BigDecimal("0.85");
    private static final BigDecimal FAIL_THRESHOLD = new BigDecimal("50");

    public ScoreCalculationResult calculate(Startup startup, Investor investor, ScorePolicy policy) {
        List<CriterionEvaluation> evaluations = new ArrayList<>();
        Map<ScoreDimension, BigDecimal> dimensionScores = new EnumMap<>(ScoreDimension.class);
        boolean criticalViolation = false;

        for (ScoreCriterion criterion : getActiveCriteria(policy)) {
            CriterionEvaluation evaluation = evaluateCriterion(criterion, startup, investor);

            if (evaluation.getCriticality() == CriticalityLevel.CRITICAL && evaluation.isFailed()) {
                criticalViolation = true;
            }

            evaluations.add(evaluation);

            dimensionScores.merge(
                    evaluation.getDimension(),
                    evaluation.getAdjustedScore(),
                    BigDecimal::add
            );
        }

        if (criticalViolation) {
            return ScoreCalculationResult.builder()
                    .criticalViolation(true)
                    .criterionEvaluations(evaluations)
                    .dimensionScores(dimensionScores)
                    .build();
        }

        BigDecimal totalScore = computeTotalScore(evaluations);

        return ScoreCalculationResult.builder()
                .totalScore(totalScore)
                .classification(classify(totalScore))
                .criterionEvaluations(evaluations)
                .dimensionScores(dimensionScores)
                .criticalViolation(false)
                .build();
    }

    private List<ScoreCriterion> getActiveCriteria(ScorePolicy policy) {
        return policy.getCriteria() == null ? List.of() : policy.getCriteria().stream()
                .filter(ScoreCriterion::isActive)
                .toList();
    }

    private CriterionEvaluation evaluateCriterion(
            ScoreCriterion criterion,
            Startup startup,
            Investor investor
    ) {
        BigDecimal rawScore = switch (criterion.getCode()) {
            case "SEGMENTO_MATCH" -> evaluateExactMatch(
                    startup.getSegmento(), investor.getSegmentosInteresse());
            case "ESTAGIO_FIT" -> evaluateExactMatch(
                    startup.getEstagio(), investor.getEstagiosInteresse());
            case "CAPITAL_FIT" -> evaluateCapitalRange(
                    startup.getCapitalProcurado(),
                    investor.getTicketMinimo(),
                    investor.getTicketMaximo());
            case "REGIAO_FIT" -> evaluateExactMatch(
                    startup.getLocalizacao(), investor.getRegiaoInteresse());
            case "MODELO_NEGOCIO_FIT" -> new BigDecimal("50");
            default -> new BigDecimal("50");
        };

        BigDecimal adjustedScore = applyCriticality(rawScore, criterion.getCriticality());
        boolean failed = rawScore.compareTo(FAIL_THRESHOLD) < 0;

        return CriterionEvaluation.builder()
                .code(criterion.getCode())
                .dimension(criterion.getDimension())
                .rawScore(rawScore.setScale(2, RoundingMode.HALF_UP))
                .adjustedScore(adjustedScore.setScale(2, RoundingMode.HALF_UP))
                .weight(criterion.getWeight())
                .criticality(criterion.getCriticality())
                .explanation(buildExplanation(criterion, rawScore))
                .failed(failed)
                .build();
    }

    private BigDecimal evaluateExactMatch(String startupValue, String investorCsv) {
        if (startupValue == null || investorCsv == null || investorCsv.isBlank()) {
            return ZERO;
        }

        for (String interest : investorCsv.split(",")) {
            if (interest.trim().equalsIgnoreCase(startupValue.trim())) {
                return HUNDRED;
            }
        }
        return ZERO;
    }

    private BigDecimal evaluateCapitalRange(
            BigDecimal capitalProcurado,
            BigDecimal ticketMinimo,
            BigDecimal ticketMaximo
    ) {
        if (capitalProcurado == null || ticketMinimo == null || ticketMaximo == null) {
            return FIFTY;
        }

        if (capitalProcurado.compareTo(ticketMinimo) >= 0
                && capitalProcurado.compareTo(ticketMaximo) <= 0) {
            return HUNDRED;
        }

        BigDecimal distance;
        if (capitalProcurado.compareTo(ticketMinimo) < 0) {
            distance = ticketMinimo.subtract(capitalProcurado);
            BigDecimal reference = ticketMinimo;
            BigDecimal percentage = distance.divide(reference, 4, RoundingMode.HALF_UP);
            BigDecimal score = HUNDRED.subtract(percentage.multiply(HUNDRED));
            return score.max(ZERO);
        } else {
            distance = capitalProcurado.subtract(ticketMaximo);
            BigDecimal reference = ticketMaximo;
            BigDecimal percentage = distance.divide(reference, 4, RoundingMode.HALF_UP);
            BigDecimal score = HUNDRED.subtract(percentage.multiply(HUNDRED));
            return score.max(ZERO);
        }
    }

    private BigDecimal applyCriticality(BigDecimal rawScore, CriticalityLevel level) {
        if (rawScore.compareTo(FAIL_THRESHOLD) >= 0) {
            return rawScore;
        }

        return switch (level) {
            case CRITICAL -> ZERO;
            case HIGH -> rawScore.multiply(HIGH_PENALTY).setScale(2, RoundingMode.HALF_UP);
            case MEDIUM -> rawScore.multiply(MEDIUM_PENALTY).setScale(2, RoundingMode.HALF_UP);
            case LOW -> rawScore;
        };
    }

    private BigDecimal computeTotalScore(List<CriterionEvaluation> evaluations) {
        BigDecimal total = ZERO;
        for (CriterionEvaluation evaluation : evaluations) {
            BigDecimal contribution = evaluation.getWeight()
                    .multiply(evaluation.getAdjustedScore());
            total = total.add(contribution);
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }

    private MatchScoreClassification classify(BigDecimal score) {
        if (score.compareTo(new BigDecimal("85")) >= 0) return MatchScoreClassification.EXCELENTE;
        if (score.compareTo(new BigDecimal("70")) >= 0) return MatchScoreClassification.FORTE;
        if (score.compareTo(new BigDecimal("55")) >= 0) return MatchScoreClassification.MODERADO;
        if (score.compareTo(new BigDecimal("40")) >= 0) return MatchScoreClassification.FRACO;
        return MatchScoreClassification.SEM_MATCH;
    }

    private String buildExplanation(ScoreCriterion criterion, BigDecimal rawScore) {
        return String.format("%s: score bruto %.2f", criterion.getLabel(), rawScore);
    }
}
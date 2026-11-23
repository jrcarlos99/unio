package br.com.unio.matchmaking_backend.scorecard.common.config;

import br.com.unio.matchmaking_backend.scorecard.common.CriticalityLevel;
import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import br.com.unio.matchmaking_backend.scorecard.common.ScoreDimension;
import br.com.unio.matchmaking_backend.scorecard.policy.ScoreCriterion;
import br.com.unio.matchmaking_backend.scorecard.policy.ScoreCriterionRepository;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicyRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Políticas padrão do scorecard (pesos dos critérios), não dados de exemplo.
 *
 * <p>D057: antes só rodava no perfil dev, e um banco novo em produção ficava sem política
 * ativa: a descoberta respondia 500 (POLICY_NOT_FOUND). Agora roda em qualquer perfil,
 * continua idempotente (não faz nada se já existir alguma política, nem altera as que o
 * admin criou) e pode ser desligado com unio.scorecard.seed-default-policies=false.
 */
@Component
@ConditionalOnProperty(name = "unio.scorecard.seed-default-policies", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class ScorecardSeedRunner implements CommandLineRunner {

    private final ScorePolicyRepository scorePolicyRepository;
    private final ScoreCriterionRepository scoreCriterionRepository;

    @Override
    public void run(String... args) {
        if (scorePolicyRepository.count() > 0) {
            log.info("[seed] Políticas já existem. Seed ignorado.");
            return;
        }

        log.info("[seed] Nenhuma política encontrada. Criando seed inicial.");

        seedPolicy(InvestorProfileType.ANGEL_INVESTOR);
        seedPolicy(InvestorProfileType.MENTOR);
        seedPolicy(InvestorProfileType.VENTURE_CAPITAL);

        log.info("[seed] Seed concluído: {} policies, {} critérios.",
                scorePolicyRepository.count(),
                scoreCriterionRepository.count());
    }

    private void seedPolicy(InvestorProfileType profileType) {
        ScorePolicy policy = ScorePolicy.builder()
                .investorProfileType(profileType)
                .version(1)
                .active(true)
                .name("Default policy - " + profileType.name())
                .createdAt(Instant.now())
                .build();

        ScorePolicy savedPolicy = scorePolicyRepository.save(policy);

        List<ScoreCriterion> criteria = List.of(
                buildCriterion(savedPolicy, "SEGMENTO_MATCH", "Match de segmento",
                        ScoreDimension.SEGMENTO, new BigDecimal("0.25"), CriticalityLevel.HIGH),
                buildCriterion(savedPolicy, "ESTAGIO_FIT", "Compatibilidade de estágio",
                        ScoreDimension.ESTAGIO, new BigDecimal("0.20"), CriticalityLevel.HIGH),
                buildCriterion(savedPolicy, "CAPITAL_FIT", "Compatibilidade de capital",
                        ScoreDimension.CAPITAL, new BigDecimal("0.25"), CriticalityLevel.CRITICAL),
                buildCriterion(savedPolicy, "REGIAO_FIT", "Compatibilidade de região",
                        ScoreDimension.REGIAO, new BigDecimal("0.15"), CriticalityLevel.MEDIUM),
                buildCriterion(savedPolicy, "MODELO_NEGOCIO_FIT", "Compatibilidade de modelo de negócio",
                        ScoreDimension.MODELO_NEGOCIO, new BigDecimal("0.15"), CriticalityLevel.MEDIUM)
        );

        scoreCriterionRepository.saveAll(criteria);

        log.info("[seed] Policy criada para {} com {} critérios (total weight = 1.00).",
                profileType, criteria.size());
    }

    private ScoreCriterion buildCriterion(
            ScorePolicy policy,
            String code,
            String label,
            ScoreDimension dimension,
            BigDecimal weight,
            CriticalityLevel criticality
    ) {
        return ScoreCriterion.builder()
                .scorePolicy(policy)
                .code(code)
                .label(label)
                .dimension(dimension)
                .weight(weight)
                .criticality(criticality)
                .active(true)
                .build();
    }
}
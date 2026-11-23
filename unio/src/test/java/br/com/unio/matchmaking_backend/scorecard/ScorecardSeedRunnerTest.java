package br.com.unio.matchmaking_backend.scorecard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.scorecard.common.config.ScorecardSeedRunner;
import br.com.unio.matchmaking_backend.scorecard.policy.ScoreCriterionRepository;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;

/** D057: políticas padrão do scorecard em qualquer perfil, sem sobrescrever as existentes. */
class ScorecardSeedRunnerTest {

    @Test
    void naoDependeDoPerfilDevEPodeSerDesligado() {
        assertThat(ScorecardSeedRunner.class.getAnnotation(Profile.class)).isNull();
        ConditionalOnProperty condicao = ScorecardSeedRunner.class.getAnnotation(ConditionalOnProperty.class);
        assertThat(condicao).isNotNull();
        assertThat(condicao.name()).containsExactly("unio.scorecard.seed-default-policies");
        assertThat(condicao.matchIfMissing()).isTrue();
    }

    @Test
    void bancoSemPoliticaRecebeAsTresPadrao() {
        ScorePolicyRepository policies = mock(ScorePolicyRepository.class);
        ScoreCriterionRepository criteria = mock(ScoreCriterionRepository.class);
        when(policies.count()).thenReturn(0L);
        when(policies.save(any(ScorePolicy.class))).thenAnswer(invocation -> invocation.getArgument(0));

        new ScorecardSeedRunner(policies, criteria).run();

        verify(policies, times(3)).save(any(ScorePolicy.class));
        verify(criteria, times(3)).saveAll(anyList());
    }

    @Test
    void bancoComPoliticaNaoMudaNada() {
        ScorePolicyRepository policies = mock(ScorePolicyRepository.class);
        ScoreCriterionRepository criteria = mock(ScoreCriterionRepository.class);
        when(policies.count()).thenReturn(1L);

        new ScorecardSeedRunner(policies, criteria).run();

        verify(policies, never()).save(any());
        verify(criteria, never()).saveAll(anyList());
    }
}

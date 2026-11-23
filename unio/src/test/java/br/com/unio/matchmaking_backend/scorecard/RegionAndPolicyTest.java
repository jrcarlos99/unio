package br.com.unio.matchmaking_backend.scorecard;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.unio.matchmaking_backend.scorecard.calculation.service.RegionMatcher;
import br.com.unio.matchmaking_backend.scorecard.calculation.service.ScorePersistenceService;
import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import org.junit.jupiter.api.Test;

/** D047: comparação de região e tipo de política pelo perfilRisco. */
class RegionAndPolicyTest {

    @Test
    void regiaoAcertaPorCidadeUfENordeste() {
        assertThat(RegionMatcher.matches("Recife", "Nordeste")).isTrue();
        assertThat(RegionMatcher.matches("Recife, PE", "Recife / Porto Digital")).isTrue();
        assertThat(RegionMatcher.matches("Recife, PE", "Nordeste")).isTrue();
        assertThat(RegionMatcher.matches("Salvador - BA", "nordeste")).isTrue();
        assertThat(RegionMatcher.matches("Recife, PE", "PE")).isTrue();
        assertThat(RegionMatcher.matches("São Paulo, SP", "Sao Paulo")).isTrue();
        assertThat(RegionMatcher.matches("Caruaru/PE", "Sudeste, PE")).isTrue();
        // Opções do onboarding do front
        assertThat(RegionMatcher.matches("Recife, PE", "Pernambuco")).isTrue();
        assertThat(RegionMatcher.matches("Curitiba, PR", "Todo o Brasil")).isTrue();
        assertThat(RegionMatcher.matches("Recife, PE", "Aberto a startups remotas,Pernambuco")).isTrue();
        // Regra antiga (texto igual) continua valendo
        assertThat(RegionMatcher.matches("Recife, PE", "recife, pe")).isTrue();
    }

    @Test
    void regiaoNaoAcertaForaDaRegiao() {
        assertThat(RegionMatcher.matches("São Paulo, SP", "Nordeste")).isFalse();
        assertThat(RegionMatcher.matches("Recife, PE", "Sudeste")).isFalse();
        assertThat(RegionMatcher.matches("Recife, PE", "Recifeira")).isFalse();
        assertThat(RegionMatcher.matches("Natal, RN", "Pernambuco")).isFalse();
        assertThat(RegionMatcher.matches("Recife, PE", "Aberto a startups remotas")).isFalse();
        assertThat(RegionMatcher.matches("Recife, PE", null)).isFalse();
        assertThat(RegionMatcher.matches(null, "Nordeste")).isFalse();
        assertThat(RegionMatcher.matches("  ", "Nordeste")).isFalse();
    }

    @Test
    void tipoDePoliticaPeloPerfilRisco() {
        assertThat(ScorePersistenceService.mapToProfileType("Mentor")).isEqualTo(InvestorProfileType.MENTOR);
        assertThat(ScorePersistenceService.mapToProfileType(" mentor ")).isEqualTo(InvestorProfileType.MENTOR);
        assertThat(ScorePersistenceService.mapToProfileType("Capital de risco"))
                .isEqualTo(InvestorProfileType.VENTURE_CAPITAL);
        assertThat(ScorePersistenceService.mapToProfileType("Venture Capital"))
                .isEqualTo(InvestorProfileType.VENTURE_CAPITAL);
        assertThat(ScorePersistenceService.mapToProfileType("Investidor Anjo"))
                .isEqualTo(InvestorProfileType.ANGEL_INVESTOR);
        assertThat(ScorePersistenceService.mapToProfileType("Ambos")).isEqualTo(InvestorProfileType.ANGEL_INVESTOR);
        assertThat(ScorePersistenceService.mapToProfileType(null)).isEqualTo(InvestorProfileType.ANGEL_INVESTOR);
        assertThat(ScorePersistenceService.mapToProfileType("  ")).isEqualTo(InvestorProfileType.ANGEL_INVESTOR);
    }
}

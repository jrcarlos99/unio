package br.com.unio.matchmaking_backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

/** D056: lista de origens por propriedade. */
class CorsConfigTest {

    @Test
    void separaPorVirgulaTiraEspacosEBarraFinal() {
        assertThat(CorsConfig.parseOrigins(" https://a.vercel.app/ , http://localhost:5173,,https://a.vercel.app"))
                .containsExactly("https://a.vercel.app", "http://localhost:5173");
    }

    @Test
    void recusaAsteriscoECuringaPorqueHaCredenciais() {
        assertThatThrownBy(() -> CorsConfig.parseOrigins("*"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("não aceita \"*\"");
        assertThatThrownBy(() -> CorsConfig.parseOrigins("https://*.vercel.app"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void recusaListaVaziaEOrigemSemProtocolo() {
        assertThatThrownBy(() -> CorsConfig.parseOrigins(" , ")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> CorsConfig.parseOrigins("unio.vercel.app")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void configuracaoUsaAsOrigensComCredenciais() {
        CorsConfigurationSource source = CorsConfig.buildSource(List.of("https://front.exemplo.app"));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/profile/me");
        CorsConfiguration config = source.getCorsConfiguration(request);

        assertThat(config).isNotNull();
        assertThat(config.getAllowedOrigins()).containsExactly("https://front.exemplo.app");
        assertThat(config.getAllowCredentials()).isTrue();
        assertThat(config.checkOrigin("https://front.exemplo.app")).isEqualTo("https://front.exemplo.app");
        assertThat(config.checkOrigin("https://desconhecido.app")).isNull();
    }
}

package br.com.unio.matchmaking_backend.config;

import java.util.Arrays;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * D056: origens permitidas por propriedade, não mais fixas no código.
 *
 * <p>{@code unio.cors.allowed-origins} é uma lista separada por vírgulas, lida da variável
 * de ambiente {@code UNIO_CORS_ALLOWED_ORIGINS}; sem ela, valem as origens de
 * desenvolvimento e os dois domínios da Vercel (application.properties). Como as
 * requisições levam credenciais ({@code allowCredentials}), "*" e curingas são recusados
 * na subida, com mensagem clara, em vez de quebrar só na primeira requisição.
 */
@Configuration
@Slf4j
public class CorsConfig {

    static final String PROPRIEDADE = "unio.cors.allowed-origins";

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${" + PROPRIEDADE + "}") String allowedOrigins) {
        List<String> origens = parseOrigins(allowedOrigins);
        log.info("[cors] Origens permitidas: {}", origens);
        return buildSource(origens);
    }

    /** Separa por vírgula, tira espaços e a barra final; recusa vazio e curingas. */
    static List<String> parseOrigins(String valor) {
        List<String> origens = Arrays.stream(valor == null ? new String[0] : valor.split(","))
                .map(String::trim)
                .map(origem -> origem.replaceAll("/+$", ""))
                .filter(origem -> !origem.isEmpty())
                .distinct()
                .toList();
        if (origens.isEmpty()) {
            throw new IllegalStateException(PROPRIEDADE + " está vazia: defina ao menos uma origem do front");
        }
        for (String origem : origens) {
            if (origem.contains("*")) {
                throw new IllegalStateException(PROPRIEDADE + " não aceita \"*\" nem curingas com credenciais "
                        + "(allowCredentials): liste as origens exatas, ex.: https://meu-front.vercel.app");
            }
            if (!origem.startsWith("http://") && !origem.startsWith("https://")) {
                throw new IllegalStateException(PROPRIEDADE + ": origem inválida \"" + origem
                        + "\" (use http:// ou https://, sem caminho)");
            }
        }
        return origens;
    }

    static CorsConfigurationSource buildSource(List<String> origens) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origens);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}

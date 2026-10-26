package br.com.unio.matchmaking_backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/**
 * T19 (RNF09) — documentação OpenAPI/Swagger.
 *
 * <p>Swagger UI: {@code /swagger-ui/index.html} · JSON: {@code /v3/api-docs}.
 * O botão "Authorize" aceita o token devolvido por {@code POST /api/auth/login}
 * (cole só o token, sem o prefixo "Bearer").
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI unioOpenApi(
            @Value("${app.openapi.server-url:}") String serverUrl,
            @Value("${app.openapi.version:v2}") String version
    ) {
        OpenAPI openApi = new OpenAPI()
                .info(new Info()
                        .title("UNIO API")
                        .version(version)
                        .description("""
                                API da plataforma UNIO — matchmaking entre startups do Porto Digital e \
                                investidores anjo/mentores.

                                **Autenticação:** faça login em `POST /api/auth/login`, copie o `token` e \
                                use o botão *Authorize*. Rotas `/api/admin/**` exigem role ADMIN; \
                                mensagens, reuniões e avaliações são exclusivas de STARTUP e INVESTOR.

                                **Erros:** todas as respostas de erro seguem o formato \
                                `{ timestamp, status, error, message, path, errors[] }`.""")
                        .contact(new Contact()
                                .name("Equipe UNIO — Projeto Integrador ADS SENAC Recife")
                                .url("https://github.com/jrcarlos99/unio"))
                        .license(new License().name("Uso acadêmico")))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Token JWT de POST /api/auth/login (válido por 1 hora)")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));

        if (StringUtils.hasText(serverUrl)) {
            openApi.addServersItem(new Server().url(serverUrl).description("Servidor configurado"));
        }
        return openApi;
    }
}

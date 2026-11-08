package br.com.unio.matchmaking_backend.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/** Bloco E — hardening de segurança e formato de erro. */
class SecurityHardeningIntegrationTest extends IntegrationTestSupport {

    @Test
    void semTokenDevolve401() throws Exception {
        mockMvc.perform(get("/api/conversations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenAdulteradoDevolve401EmVezDe500() throws Exception {
        mockMvc.perform(get("/api/profile/me").header(HttpHeaders.AUTHORIZATION, "Bearer abc.def.ghi"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthCheckContinuaPublico() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    void startupNaoAcessaMetricasDeAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/metrics").header(HttpHeaders.AUTHORIZATION, bearer(createUser(Role.STARTUP))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminVeMetricasCompletas() throws Exception {
        mockMvc.perform(get("/api/admin/metrics").header(HttpHeaders.AUTHORIZATION, bearer(createUser(Role.ADMIN))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalConversations").isNumber())
                .andExpect(jsonPath("$.meetingsByStatus.PENDENTE").isNumber())
                .andExpect(jsonPath("$.totalReviews").isNumber());
    }

    /** Prova que o @PreAuthorize passou a valer (@EnableMethodSecurity). */
    @Test
    void preAuthorizeDoControllerEhAplicado() throws Exception {
        User startup = createUser(Role.STARTUP);
        mockMvc.perform(get("/api/scorecard/recommendations")
                        .param("investorId", UUID.randomUUID().toString())
                        .header(HttpHeaders.AUTHORIZATION, bearer(startup)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminNaoUsaComunicacao() throws Exception {
        mockMvc.perform(get("/api/meetings").header(HttpHeaders.AUTHORIZATION, bearer(createUser(Role.ADMIN))))
                .andExpect(status().isForbidden());
    }

    @Test
    void erroDeValidacaoTemFormatoPadrao() throws Exception {
        mockMvc.perform(post("/api/conversations/{id}/messages", 1)
                        .header(HttpHeaders.AUTHORIZATION, bearer(createUser(Role.STARTUP)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("A mensagem não pode ser vazia"))
                .andExpect(jsonPath("$.errors[0].defaultMessage").value("A mensagem não pode ser vazia"))
                .andExpect(jsonPath("$.path").value("/api/conversations/1/messages"));
    }

    @Test
    void jsonInvalidoDevolve400ComMensagem() throws Exception {
        mockMvc.perform(post("/api/conversations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(createUser(Role.STARTUP)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{participantId:"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Corpo da requisição ausente ou com JSON inválido"));
    }

    @Test
    void mensagemDeNegocioChegaAoCliente() throws Exception {
        User startup = createUser(Role.STARTUP);
        mockMvc.perform(post("/api/conversations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(startup))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participantId\":" + startup.getId() + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Não é possível interagir consigo mesmo"));
    }
}

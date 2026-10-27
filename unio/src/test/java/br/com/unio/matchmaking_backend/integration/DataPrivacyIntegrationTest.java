package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/** T13 — exportação e exclusão de dados (RNF03 / LGPD). */
class DataPrivacyIntegrationTest extends IntegrationTestSupport {

    @Test
    void exportaDadosComoAnexoSemSenha() throws Exception {
        User startup = createUser(Role.STARTUP);

        mockMvc.perform(get("/api/privacy/export").header(HttpHeaders.AUTHORIZATION, bearer(startup)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, Matchers.containsString("attachment")))
                .andExpect(jsonPath("$.account.email").value(startup.getEmail()))
                .andExpect(jsonPath("$.account.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.conversations").isArray())
                .andExpect(jsonPath("$.meetings").isArray());
    }

    @Test
    void exclusaoComSenhaErradaEhRecusada() throws Exception {
        User startup = createUser(Role.STARTUP);

        mockMvc.perform(post("/api/privacy/delete-account").header(HttpHeaders.AUTHORIZATION, bearer(startup))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"errada\",\"confirmed\":true}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Senha incorreta"));
    }

    @Test
    void exclusaoSemConfirmacaoEhRecusada() throws Exception {
        User startup = createUser(Role.STARTUP);

        mockMvc.perform(post("/api/privacy/delete-account").header(HttpHeaders.AUTHORIZATION, bearer(startup))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"" + DEFAULT_PASSWORD + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void exclusaoAnonimizaContaEInvalidaOToken() throws Exception {
        User startup = createUser(Role.STARTUP);
        User investor = createUser(Role.INVESTOR);
        String startupToken = bearer(startup);
        String investorToken = bearer(investor);
        String originalEmail = startup.getEmail();

        // Conversa com uma mensagem da startup
        String conversationJson = mockMvc.perform(post("/api/conversations")
                        .header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participantId\":" + startup.getId() + "}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long conversationId = ((Number) com.jayway.jsonpath.JsonPath.read(conversationJson, "$.id")).longValue();

        mockMvc.perform(post("/api/conversations/{id}/messages", conversationId)
                        .header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Meu telefone pessoal é 81 99999-0000\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/privacy/delete-account").header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"" + DEFAULT_PASSWORD + "\",\"confirmed\":true}"))
                .andExpect(status().isNoContent());

        User reloaded = userRepository.findById(startup.getId()).orElseThrow();
        assertThat(reloaded.isDeleted()).isTrue();
        assertThat(reloaded.getEmail()).isNotEqualTo(originalEmail).endsWith("@unio.invalid");
        assertThat(userRepository.findByEmail(originalEmail)).isEmpty();

        // O token antigo deixa de valer
        mockMvc.perform(get("/api/profile/me").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isUnauthorized());

        // O investidor ainda vê a conversa, mas sem o conteúdo pessoal e com o participante removido
        mockMvc.perform(get("/api/conversations/{id}/messages", conversationId)
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].content").value("[mensagem removida a pedido do titular]"));

        mockMvc.perform(get("/api/conversations").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].participant.name").value("Usuário removido"))
                .andExpect(jsonPath("$[0].participant.active").value(false));

        // E não consegue mais enviar mensagens para quem saiu
        mockMvc.perform(post("/api/conversations/{id}/messages", conversationId)
                        .header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Oi?\"}"))
                .andExpect(status().isConflict());
    }
}

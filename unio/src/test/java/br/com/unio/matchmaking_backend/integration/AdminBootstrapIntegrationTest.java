package br.com.unio.matchmaking_backend.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/** D054: bootstrap-admin recebe e-mail e senha no corpo, nunca na query string. */
class AdminBootstrapIntegrationTest extends IntegrationTestSupport {

    @Test
    void criaAdministradorPeloCorpo() throws Exception {
        String email = "admin-" + UUID.randomUUID() + "@teste.unio";
        mockMvc.perform(post("/api/admin/bootstrap-admin")
                        .header(HttpHeaders.AUTHORIZATION, bearer(createUser(Role.ADMIN)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"%s\", \"password\": \"senhaForte123\"}".formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void queryStringNaoFuncionaMaisESenhaCurtaEhRecusada() throws Exception {
        String adminToken = bearer(createUser(Role.ADMIN));
        mockMvc.perform(post("/api/admin/bootstrap-admin")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .param("email", "admin-" + UUID.randomUUID() + "@teste.unio")
                        .param("password", "senhaForte123"))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(post("/api/admin/bootstrap-admin")
                        .header(HttpHeaders.AUTHORIZATION, adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"admin-%s@teste.unio\", \"password\": \"curta\"}"
                                .formatted(UUID.randomUUID())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void naoAdminRecebe403() throws Exception {
        mockMvc.perform(post("/api/admin/bootstrap-admin")
                        .header(HttpHeaders.AUTHORIZATION, bearer(createUser(Role.INVESTOR)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"x-%s@teste.unio\", \"password\": \"senhaForte123\"}"
                                .formatted(UUID.randomUUID())))
                .andExpect(status().isForbidden());
    }
}

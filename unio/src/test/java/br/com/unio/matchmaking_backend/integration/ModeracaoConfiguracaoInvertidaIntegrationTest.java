package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import com.jayway.jsonpath.JsonPath;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;

/**
 * D063: as duas propriedades com o valor contrário ao padrão. Cadastro novo entra PENDENTE
 * (fora da descoberta, login liberado) e o pitch publica direto, sem revisão.
 */
@TestPropertySource(properties = {
        "unio.moderation.cadastro-requer-aprovacao=true",
        "unio.moderation.pitch-requer-aprovacao=false"
})
class ModeracaoConfiguracaoInvertidaIntegrationTest extends ModeracaoTestSupport {

    private List<Integer> discoveredStartupIds(User investor) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/discovery/startups").param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.items[*].userId");
    }

    @Test
    void cadastroNovoFicaPendenteForaDaDescobertaAteOAdminAprovar() throws Exception {
        User admin = createUser(Role.ADMIN);
        User investor = createInvestorWithProfile();
        String email = "pendente-" + System.nanoTime() + "@teste.unio";
        String documento = String.valueOf(System.nanoTime()).substring(0, 11);
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "%s", "password": "%s", "role": "STARTUP",
                                 "documento": "%s", "acceptedTerms": true}
                                """.formatted(email, DEFAULT_PASSWORD, documento)))
                .andExpect(status().isCreated());
        novaRequisicao();
        User pendente = userRepository.findByEmail(email).orElseThrow();
        startupRepository.save(Startup.builder()
                .user(pendente)
                .nome("Pendente " + System.nanoTime())
                .segmento("Logística").estagio("Seed").localizacao("Recife, PE")
                .modeloNegocio("B2B").mercadoAlvo("Transportadoras")
                .capitalProcurado(new BigDecimal("300000"))
                .build());
        novaRequisicao();

        // Pendente entra normalmente (precisa completar o perfil), mas não aparece para ninguém
        login(pendente, DEFAULT_PASSWORD).andExpect(status().isOk());
        assertThat(discoveredStartupIds(investor)).doesNotContain(pendente.getId().intValue());
        mockMvc.perform(get("/api/admin/moderation/accounts").param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].status").value("PENDENTE"));
        mockMvc.perform(get("/api/admin/moderation/accounts").param("status", "PENDENTE").param("q", email)
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].profileComplete").value(true));

        adminAction(admin, "/api/admin/moderation/accounts/" + pendente.getId() + "/approve", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APROVADO"));
        novaRequisicao();
        assertThat(discoveredStartupIds(investor)).contains(pendente.getId().intValue());
    }

    @Test
    void semRevisaoOPitchPublicaDiretoEOAdminAindaRemove() throws Exception {
        User admin = createUser(Role.ADMIN);
        User startup = createStartupWithProfile();
        User investor = createInvestorWithProfile();
        novaRequisicao();
        mockMvc.perform(get("/api/profile/startup/pitch/publication").header(HttpHeaders.AUTHORIZATION, bearer(startup)))
                .andExpect(jsonPath("$.requiresApproval").value(false));

        savePitch(startup, "Publicado sem revisão", null, "Problema");
        MvcResult submitted = submitPitch(startup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLICADO"))
                .andExpect(jsonPath("$.reviewedAt").doesNotExist())
                .andReturn();
        novaRequisicao();
        mockMvc.perform(get("/api/discovery/startups/{id}/pitch", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortPitch").value("Publicado sem revisão"));

        adminAction(admin, "/api/admin/moderation/content/" + idFrom(submitted) + "/remove", "Fora das regras")
                .andExpect(status().isOk());
        novaRequisicao();
        mockMvc.perform(get("/api/discovery/startups/{id}/pitch", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isNotFound());
    }
}

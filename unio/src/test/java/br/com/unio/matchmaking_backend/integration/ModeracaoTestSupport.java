package br.com.unio.matchmaking_backend.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** D063: apoio comum aos testes de moderação (contas com perfil, onboarding do pitch, ações do ADMIN). */
abstract class ModeracaoTestSupport extends IntegrationTestSupport {

    @Autowired
    protected StartupRepository startupRepository;

    @Autowired
    protected InvestorRepository investorRepository;

    @Autowired
    protected EntityManager entityManager;

    protected User createStartupWithProfile() {
        User user = createUser(Role.STARTUP);
        startupRepository.save(Startup.builder()
                .user(user)
                .nome("Moderação Teste " + UUID.randomUUID())
                .segmento("Logística")
                .estagio("Seed")
                .localizacao("Recife, PE")
                .modeloNegocio("B2B")
                .mercadoAlvo("Transportadoras")
                .capitalProcurado(new BigDecimal("300000"))
                .build());
        return user;
    }

    protected User createInvestorWithProfile() {
        User user = createUser(Role.INVESTOR);
        investorRepository.save(Investor.builder()
                .user(user)
                .segmentosInteresse("Logística")
                .estagiosInteresse("Seed")
                .ticketMinimo(new BigDecimal("100000"))
                .ticketMaximo(new BigDecimal("500000"))
                .regiaoInteresse("Nordeste")
                .perfilRisco("Investidor Anjo")
                .build());
        return user;
    }

    /** Simula uma requisição nova: grava o que está pendente e limpa o cache do JPA. */
    protected void novaRequisicao() {
        entityManager.flush();
        entityManager.clear();
    }

    /** Salva o pitch como o front salva (PUT /api/profile/onboarding, chaves do pitchService.ts). */
    protected void savePitch(User startup, String shortPitch, String videoUrl, String problem) throws Exception {
        String video = videoUrl == null ? "null" : "\"" + videoUrl + "\"";
        mockMvc.perform(put("/api/profile/onboarding").header(HttpHeaders.AUTHORIZATION, bearer(startup))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"respostas": {
                                  "pitch": "%s",
                                  "pitchLeanCanvas": {
                                    "version": 1, "status": "DRAFT", "videoUrl": %s,
                                    "updatedAt": "2026-11-22T10:00:00Z",
                                    "leanCanvas": {
                                      "problem": "%s", "solution": "Roteirização com IA",
                                      "keyMetrics": "Entregas por dia", "uniqueValueProposition": "Frete mais barato",
                                      "unfairAdvantage": "Base de dados própria", "channels": "Vendas diretas",
                                      "customerSegments": "Transportadoras regionais",
                                      "costStructure": "Nuvem e equipe", "revenueStreams": "Assinatura mensal"
                                    }
                                  }
                                }}
                                """.formatted(shortPitch, video, problem)))
                .andExpect(status().isOk());
    }

    protected ResultActions submitPitch(User startup) throws Exception {
        return mockMvc.perform(post("/api/profile/startup/pitch/publication")
                .header(HttpHeaders.AUTHORIZATION, bearer(startup)));
    }

    protected ResultActions adminAction(User admin, String path, String reason) throws Exception {
        var request = post(path).header(HttpHeaders.AUTHORIZATION, bearer(admin));
        if (reason != null) {
            request = request.contentType(MediaType.APPLICATION_JSON)
                    .content("{\"reason\": \"%s\"}".formatted(reason));
        }
        return mockMvc.perform(request);
    }

    protected ResultActions login(User user, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"%s\", \"password\": \"%s\"}".formatted(user.getEmail(), password)));
    }
}

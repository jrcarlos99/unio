package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.match.entity.MatchInterestStatus;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/**
 * D058: o merge com o main deixou uma implementação só para cada conceito duplicado. Estes
 * testes garantem que as rotas das duas linhas continuam funcionando e leem e gravam no
 * mesmo lugar.
 */
class UnificacaoMainIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private StartupRepository startupRepository;

    @Autowired
    private InvestorRepository investorRepository;

    private User startup;
    private User investor;
    private String startupToken;
    private String investorToken;

    @BeforeEach
    void setUp() {
        startup = createStartup();
        investor = createInvestor();
        startupToken = bearer(startup);
        investorToken = bearer(investor);
    }

    private User createStartup() {
        User user = createUser(Role.STARTUP);
        startupRepository.save(Startup.builder()
                .user(user)
                .nome("Unificação Teste " + UUID.randomUUID())
                .segmento("Logística")
                .estagio("Seed")
                .localizacao("Recife, PE")
                .modeloNegocio("B2B")
                .mercadoAlvo("Transportadoras")
                .capitalProcurado(new BigDecimal("300000"))
                .pitchFileUrl("/uploads/pitch/arquivo.pdf")
                .build());
        return user;
    }

    private User createInvestor() {
        User user = createUser(Role.INVESTOR);
        investorRepository.save(Investor.builder()
                .user(user)
                .segmentosInteresse("Logística")
                .estagiosInteresse("Seed")
                .ticketMinimo(new BigDecimal("100000"))
                .ticketMaximo(new BigDecimal("500000"))
                .regiaoInteresse("Recife / Porto Digital")
                .perfilRisco("Investidor Anjo")
                .build());
        return user;
    }

    private String matchBody() {
        return """
                {"startupId": %d, "investorId": %d}
                """.formatted(startup.getId(), investor.getId());
    }

    // ------------------------------------------------------------
    // Interesse e match: /api/matches (main) e /api/interests (Carol)
    // ------------------------------------------------------------

    @Test
    void rotasDoMainEDaCarolGravamELeemNoMesmoLugar() throws Exception {
        // Investidor curte pela rota do main
        mockMvc.perform(post("/api/matches/interest").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON).content(matchBody()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("LIKED"))
                .andExpect(jsonPath("$.likedByUserId").value(investor.getId()));

        // A startup vê o interesse recebido na descoberta e responde pela rota da Carol
        mockMvc.perform(put("/api/interests/{id}", investor.getId()).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MATCH"));

        // As duas rotas de leitura enxergam o mesmo match
        mockMvc.perform(get("/api/matches").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("MATCHED"))
                .andExpect(jsonPath("$[0].startupId").value(startup.getId()));
        mockMvc.perform(get("/api/interests/matches").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].userId").value(startup.getId()))
                .andExpect(jsonPath("$[0].contact.email").value(startup.getEmail()));
        mockMvc.perform(get("/api/matches/saved").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // Repetir pela rota do main não muda nada (idempotente)
        mockMvc.perform(post("/api/matches/interest").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON).content(matchBody()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("MATCHED"));
        assertThat(matchInterestRepository.findAll().stream()
                .filter(row -> row.getStartupId().equals(startup.getId())))
                .hasSize(2)
                .allMatch(row -> row.getStatus() == MatchInterestStatus.MATCHED);

        // Desfazer pela rota da Carol desfaz para a rota do main também
        mockMvc.perform(delete("/api/interests/{id}", investor.getId()).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RECEIVED"));
        mockMvc.perform(get("/api/matches").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get("/api/matches/saved").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("LIKED"));
    }

    @Test
    void rotaDoMainMantemSuasValidacoes() throws Exception {
        User otherStartup = createStartup();
        mockMvc.perform(post("/api/matches/interest").header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startupId": %d, "investorId": %d}
                                """.formatted(otherStartup.getId(), investor.getId())))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/matches/interest").header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startupId\": %d}".formatted(startup.getId())))
                .andExpect(status().isBadRequest());
        User admin = createUser(Role.ADMIN);
        mockMvc.perform(get("/api/matches").header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------
    // Recomendações: regra única (D048 + T20)
    // ------------------------------------------------------------

    @Test
    void recomendacoesUsamORegraUnicaDeAcesso() throws Exception {
        String ownInvestorId = new UUID(0L, investor.getId()).toString();
        String otherUserId = new UUID(0L, startup.getId()).toString();

        mockMvc.perform(get("/api/scorecard/recommendations").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/scorecard/recommendations").param("investorId", ownInvestorId)
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/scorecard/recommendations").param("investorId", otherUserId)
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/scorecard/recommendations/investors").param("startupId", ownInvestorId)
                        .header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/scorecard/recommendations/investors").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isForbidden());
        User admin = createUser(Role.ADMIN);
        mockMvc.perform(get("/api/scorecard/recommendations").param("investorId", ownInvestorId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk());
    }

    @Test
    void recomendacaoDeInvestidorSoMostraEmailDepoisDoMatch() throws Exception {
        // A descoberta calcula e grava o score do par
        mockMvc.perform(get("/api/discovery/investors").param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk());
        String investorUuid = new UUID(0L, investor.getId()).toString();
        String path = "$[?(@.investorId == '" + investorUuid + "')]";

        mockMvc.perform(get("/api/scorecard/recommendations/investors").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath(path, hasSize(1)))
                .andExpect(jsonPath(path + ".investorEmail").value(org.hamcrest.Matchers.contains(nullValue())));

        createMatch(startup, investor);
        mockMvc.perform(get("/api/scorecard/recommendations/investors").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(jsonPath(path + ".investorEmail").value(org.hamcrest.Matchers.contains(investor.getEmail())));
    }

    // ------------------------------------------------------------
    // Perfis públicos: mesmas regras da descoberta (D046 e D052)
    // ------------------------------------------------------------

    @Test
    void perfilPublicoSoMostraEmailDepoisDoMatchENuncaOArquivoDePitch() throws Exception {
        mockMvc.perform(get("/api/profile/startup/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(startup.getId()))
                .andExpect(jsonPath("$.segmento").value("Logística"))
                .andExpect(jsonPath("$.email").value(nullValue()))
                .andExpect(jsonPath("$.pitchFileUrl").value(nullValue()));
        mockMvc.perform(get("/api/profile/investor/{id}", investor.getId()).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.segmentosInteresse[0]").value("Logística"))
                .andExpect(jsonPath("$.email").value(nullValue()));

        // O próprio titular vê tudo
        mockMvc.perform(get("/api/profile/startup/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(jsonPath("$.email").value(startup.getEmail()))
                .andExpect(jsonPath("$.pitchFileUrl").value("/uploads/pitch/arquivo.pdf"));

        // Depois do match, o e-mail aparece para o outro lado; o arquivo de pitch não
        createMatch(startup, investor);
        mockMvc.perform(get("/api/profile/startup/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(jsonPath("$.email").value(startup.getEmail()))
                .andExpect(jsonPath("$.pitchFileUrl").value(nullValue()));
    }

    @Test
    void perfilPublicoDeContaRemovidaDa404() throws Exception {
        startup.setDeletedAt(Instant.now());
        userRepository.save(startup);
        mockMvc.perform(get("/api/profile/startup/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isNotFound());
    }

    // ------------------------------------------------------------
    // Login inválido e 401 padronizado
    // ------------------------------------------------------------

    @Test
    void loginInvalidoRespondeCredenciaisInvalidas() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "%s", "password": "senhaErrada999"}
                                """.formatted(startup.getEmail())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Credenciais inválidas"));
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "ninguem-%s@teste.unio", "password": "senhaErrada999"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Credenciais inválidas"));
        // Rota protegida sem token continua com o 401 do main
        mockMvc.perform(get("/api/profile/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Não autenticado"));
    }

    // ------------------------------------------------------------
    // Dashboard da startup: números das fontes únicas
    // ------------------------------------------------------------

    @Test
    void dashboardDaStartupContaMatchesReaisEVisitas() throws Exception {
        mockMvc.perform(get("/api/profile/startup/dashboard").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMatches").value(0))
                .andExpect(jsonPath("$.totalVisualizacoes").value(0));

        createMatch(startup, investor);
        mockMvc.perform(post("/api/profile-views").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\": %d}".formatted(startup.getId())))
                .andExpect(status().is2xxSuccessful());

        mockMvc.perform(get("/api/profile/startup/dashboard").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(jsonPath("$.totalMatches").value(1))
                .andExpect(jsonPath("$.totalVisualizacoes").value(1));
    }
}

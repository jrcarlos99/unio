package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import com.jayway.jsonpath.JsonPath;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** D049 a D053: interesse, match mútuo, salvos, contato só depois do match e reunião só com match. */
class InterestIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private StartupRepository startupRepository;

    @Autowired
    private InvestorRepository investorRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    private User startup;
    private User investor;
    private String startupToken;
    private String investorToken;

    @BeforeEach
    void setUp() {
        startup = createUser(Role.STARTUP);
        startupRepository.save(Startup.builder()
                .user(startup)
                .nome("Tidalog Teste " + UUID.randomUUID())
                .segmento("Logística")
                .estagio("Seed")
                .localizacao("Recife, PE")
                .modeloNegocio("B2B")
                .mercadoAlvo("Transportadoras")
                .capitalProcurado(new BigDecimal("300000"))
                .build());
        investor = createUser(Role.INVESTOR);
        investorRepository.save(Investor.builder()
                .user(investor)
                .segmentosInteresse("Logística")
                .estagiosInteresse("Seed")
                .ticketMinimo(new BigDecimal("100000"))
                .ticketMaximo(new BigDecimal("500000"))
                .regiaoInteresse("Recife / Porto Digital")
                .perfilRisco("Investidor Anjo")
                .build());
        startupToken = bearer(startup);
        investorToken = bearer(investor);
    }

    private MvcResult expressInterest(String token, User target) throws Exception {
        return mockMvc.perform(put("/api/interests/{id}", target.getId()).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andReturn();
    }

    private String interestStatusInDiscovery(String token, String path, User target) throws Exception {
        String json = mockMvc.perform(get(path).param("limit", "100").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> items = JsonPath.read(json, "$.items");
        return items.stream()
                .filter(item -> ((Number) item.get("userId")).longValue() == target.getId())
                .map(item -> (String) item.get("interestStatus"))
                .findFirst()
                .orElseThrow();
    }

    private long createMeeting(String token, User other) throws Exception {
        Instant when = Instant.now().plus(3, ChronoUnit.DAYS).truncatedTo(ChronoUnit.HOURS);
        MvcResult created = mockMvc.perform(post("/api/meetings").header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"participantId": %d, "subject": "Conversa", "durationMinutes": 30,
                                 "suggestedTimes": ["%s"]}
                                """.formatted(other.getId(), when)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(created);
    }

    @Test
    void interesseUnilateralNaoViraMatchEBilateralVira() throws Exception {
        MvcResult first = expressInterest(investorToken, startup);
        assertThat((String) JsonPath.read(first.getResponse().getContentAsString(), "$.status")).isEqualTo("ENVIADO");
        // Idempotente
        expressInterest(investorToken, startup);

        assertThat(interestStatusInDiscovery(investorToken, "/api/discovery/startups", startup)).isEqualTo("SENT");
        assertThat(interestStatusInDiscovery(startupToken, "/api/discovery/investors", investor)).isEqualTo("RECEIVED");
        mockMvc.perform(get("/api/interests/matches").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.userId == %d)]".formatted(startup.getId()), hasSize(0)));

        // Interesses recebidos na popularidade (D053)
        mockMvc.perform(get("/api/profile/me/popularity").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interestsReceived").value(1));

        MvcResult second = expressInterest(startupToken, investor);
        assertThat((String) JsonPath.read(second.getResponse().getContentAsString(), "$.status")).isEqualTo("MATCH");
        assertThat((String) JsonPath.read(second.getResponse().getContentAsString(), "$.matchedAt")).isNotBlank();

        assertThat(interestStatusInDiscovery(investorToken, "/api/discovery/startups", startup)).isEqualTo("MATCH");
        mockMvc.perform(get("/api/interests/matches").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.userId == %d)].contact.email".formatted(startup.getId()))
                        .value(startup.getEmail()))
                .andExpect(jsonPath("$[?(@.userId == %d)].interestStatus".formatted(startup.getId()))
                        .value("MATCH"));
    }

    @Test
    void emailNaoApareceAntesDoMatch() throws Exception {
        expressInterest(investorToken, startup);
        mockMvc.perform(put("/api/saved/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isNoContent());

        String discovery = mockMvc.perform(get("/api/discovery/startups/{id}", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andReturn().getResponse().getContentAsString();
        String saved = mockMvc.perform(get("/api/saved").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andReturn().getResponse().getContentAsString();
        String matches = mockMvc.perform(get("/api/interests/matches").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andReturn().getResponse().getContentAsString();

        for (String json : List.of(discovery, saved, matches)) {
            assertThat(json).doesNotContain(startup.getEmail()).doesNotContain("\"contact\"");
        }
    }

    @Test
    void salvosSaoIdempotentes() throws Exception {
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(put("/api/saved/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, investorToken))
                    .andExpect(status().isNoContent());
        }
        mockMvc.perform(get("/api/saved").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].userId").value(startup.getId()))
                .andExpect(jsonPath("$[0].saved").value(true))
                .andExpect(jsonPath("$[0].profile.segmento").value("Logística"));

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(delete("/api/saved/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, investorToken))
                    .andExpect(status().isNoContent());
        }
        mockMvc.perform(get("/api/saved").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void reuniaoSemMatchRetornaErroClaroEContrapartesSoComMatch() throws Exception {
        Instant when = Instant.now().plus(3, ChronoUnit.DAYS);
        mockMvc.perform(post("/api/meetings").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"participantId": %d, "subject": "Conversa", "durationMinutes": 30,
                                 "suggestedTimes": ["%s"]}
                                """.formatted(startup.getId(), when)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(ParticipantService.MATCH_REQUIRED_MESSAGE));

        mockMvc.perform(get("/api/meetings/counterparts").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.userId == %d)]".formatted(startup.getId()), hasSize(0)));

        createMatch(startup, investor);
        mockMvc.perform(get("/api/meetings/counterparts").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(jsonPath("$[?(@.userId == %d)]".formatted(startup.getId()), hasSize(1)));
        createMeeting(investorToken, startup);
    }

    @Test
    void desfazerMatchCancelaReunioesFuturas() throws Exception {
        expressInterest(investorToken, startup);
        expressInterest(startupToken, investor);
        long pending = createMeeting(investorToken, startup);
        long confirmed = createMeeting(startupToken, investor);
        mockMvc.perform(post("/api/meetings/{id}/accept", confirmed).header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/interests/{id}", investor.getId()).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canceledMeetings").value(2))
                // O investidor continua interessado: para a startup, fica RECEIVED
                .andExpect(jsonPath("$.status").value("RECEIVED"));

        assertThat(meetingRepository.findById(pending).orElseThrow().getStatus()).isEqualTo(MeetingStatus.CANCELADA);
        assertThat(meetingRepository.findById(confirmed).orElseThrow().getStatus()).isEqualTo(MeetingStatus.CANCELADA);
        assertThat(meetingRepository.findById(pending).orElseThrow().getCancelReason()).isEqualTo("Match desfeito");

        mockMvc.perform(get("/api/interests/matches").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(jsonPath("$[?(@.userId == %d)]".formatted(startup.getId()), hasSize(0)));
        // Retirar de novo não cancela nada
        mockMvc.perform(delete("/api/interests/{id}", investor.getId()).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(jsonPath("$.canceledMeetings").value(0));
    }

    @Test
    void interesseSoEntreStartupEInvestidorComPerfil() throws Exception {
        User otherStartup = createUser(Role.STARTUP);
        mockMvc.perform(put("/api/interests/{id}", otherStartup.getId()).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isBadRequest());
        User investorWithoutProfile = createUser(Role.INVESTOR);
        mockMvc.perform(put("/api/interests/{id}", investorWithoutProfile.getId())
                        .header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/interests/{id}", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(investorWithoutProfile)))
                .andExpect(status().isConflict());
        mockMvc.perform(put("/api/interests/{id}", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(createUser(Role.ADMIN))))
                .andExpect(status().isForbidden());
    }

    @Test
    void metricasDoAdminContamMatchesMutuos() throws Exception {
        String adminToken = bearer(createUser(Role.ADMIN));
        MvcResult before = mockMvc.perform(get("/api/admin/metrics").header(HttpHeaders.AUTHORIZATION, adminToken))
                .andExpect(status().isOk())
                .andReturn();
        long mutualBefore = longAt(before, "$.mutualMatches");
        long sentBefore = longAt(before, "$.interestsSent");

        expressInterest(investorToken, startup);
        expressInterest(startupToken, investor);

        MvcResult after = mockMvc.perform(get("/api/admin/metrics").header(HttpHeaders.AUTHORIZATION, adminToken))
                .andReturn();
        assertThat(longAt(after, "$.mutualMatches")).isEqualTo(mutualBefore + 1);
        assertThat(longAt(after, "$.interestsSent")).isEqualTo(sentBefore + 2);
    }
}

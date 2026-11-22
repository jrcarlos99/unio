package br.com.unio.matchmaking_backend.integration;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** D032 a D037: proposta com 3 horários, aceite, contraproposta, remarcação, details e counterparts. */
class MeetingProposalsIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private StartupRepository startupRepository;

    @Autowired
    private InvestorRepository investorRepository;

    @Autowired
    private EntityManager entityManager;

    private User startup;
    private User investor;
    private String startupToken;
    private String investorToken;
    private Instant t1;
    private Instant t2;
    private Instant t3;

    @BeforeEach
    void setUp() {
        startup = createUser(Role.STARTUP);
        investor = createUser(Role.INVESTOR);
        // D051: reunião só entre quem deu match mútuo
        createMatch(startup, investor);
        startupToken = bearer(startup);
        investorToken = bearer(investor);
        Instant base = Instant.now().plus(Duration.ofDays(30)).truncatedTo(ChronoUnit.HOURS);
        t1 = base;
        t2 = base.plus(Duration.ofHours(2));
        t3 = base.plus(Duration.ofDays(1));
    }

    @Test
    void propostaComTresHorariosAceiteContrapropostaERemarcacao() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/meetings").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"participantId": %d, "subject": "Apresentação de pitch", "durationMinutes": 45,
                                 "suggestedTimes": ["%s", "%s", "%s"], "message": "Vamos conversar?",
                                 "format": "PRESENCIAL", "locationName": "Porto Digital",
                                 "locationAddress": "Rua do Apolo, 181"}
                                """.formatted(startup.getId(), t3, t1, t2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Apresentação de pitch"))
                .andExpect(jsonPath("$.suggestedTimes", hasSize(3)))
                .andExpect(jsonPath("$.suggestedTimes[0]").value(t1.toString()))
                .andExpect(jsonPath("$.startsAt").value(t1.toString()))
                .andExpect(jsonPath("$.proposedByMe").value(true))
                .andExpect(jsonPath("$.format").value("PRESENCIAL"))
                .andExpect(jsonPath("$.location.name").value("Porto Digital"))
                .andReturn();
        long id = idFrom(created);
        novaRequisicao();

        // Visto pela startup: proposta recebida
        mockMvc.perform(get("/api/meetings/{id}", id).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proposedByMe").value(false))
                .andExpect(jsonPath("$.organizer").value(false));

        // Mais de um horário: aceitar sem corpo dá 400; horário fora da lista também
        mockMvc.perform(post("/api/meetings/{id}/accept", id).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/meetings/{id}/accept", id).header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startsAt\": \"%s\"}".formatted(t1.plus(Duration.ofMinutes(5)))))
                .andExpect(status().isBadRequest());

        // Contraproposta da startup: agora quem responde é o investidor
        mockMvc.perform(post("/api/meetings/{id}/counter-proposal", id).header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"suggestedTimes\": [\"%s\"]}".formatted(t3.plus(Duration.ofDays(1)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.proposedByMe").value(true))
                .andExpect(jsonPath("$.suggestedTimes", hasSize(1)));
        novaRequisicao();
        mockMvc.perform(post("/api/meetings/{id}/accept", id).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/meetings/{id}/accept", id).header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADA"))
                .andExpect(jsonPath("$.startsAt").value(t3.plus(Duration.ofDays(1)).toString()));

        // Só o organizador (investidor) edita o local
        mockMvc.perform(patch("/api/meetings/{id}/details", id).header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"location\": {\"name\": \"Cais\", \"address\": \"Rua X\"}}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/meetings/{id}/details", id).header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"location\": {\"name\": \"Cais do Apolo\", \"address\": \"Rua X, 1\", \"reference\": \"Sala 3\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.location.reference").value("Sala 3"));
        mockMvc.perform(patch("/api/meetings/{id}/details", id).header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"meetingUrl\": \"http://inseguro.com\"}"))
                .andExpect(status().isBadRequest());

        // Remarcar a confirmada (qualquer participante) volta para pendente
        mockMvc.perform(post("/api/meetings/{id}/counter-proposal", id).header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"suggestedTimes\": [\"%s\", \"%s\"]}".formatted(t1, t2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.suggestedTimes", hasSize(2)));

        mockMvc.perform(post("/api/meetings/{id}/accept", id).header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startsAt\": \"%s\"}".formatted(t2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADA"))
                .andExpect(jsonPath("$.startsAt").value(t2.toString()));

        // Intervalo: só entra quem tem horário dentro dele
        mockMvc.perform(get("/api/meetings").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .param("from", t2.minus(Duration.ofMinutes(1)).toString())
                        .param("to", t2.plus(Duration.ofMinutes(1)).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
        mockMvc.perform(get("/api/meetings").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .param("from", t3.toString())
                        .param("to", t3.plus(Duration.ofHours(1)).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    /**
     * O teste roda numa transação só; cada requisição de verdade tem a sua. Sem limpar,
     * a reunião criada continua na sessão com a lista original de horários.
     */
    private void novaRequisicao() {
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void quatroHorariosDevolve400() throws Exception {
        mockMvc.perform(post("/api/meetings").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"participantId": %d, "subject": "Mentoria", "durationMinutes": 30,
                                 "suggestedTimes": ["%s", "%s", "%s", "%s"]}
                                """.formatted(startup.getId(), t1, t2, t3, t3.plus(Duration.ofHours(1)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void counterpartsSemEmail() throws Exception {
        startupRepository.save(Startup.builder().user(startup).nome("Tidalog").segmento("Logística")
                .estagio("Seed").localizacao("Recife").modeloNegocio("B2B").mercadoAlvo("Portos").build());
        investorRepository.save(Investor.builder().user(investor).perfilRisco("Investidor Anjo").build());

        mockMvc.perform(get("/api/meetings/counterparts").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.userId == %d)].name".formatted(startup.getId())).value("Tidalog"))
                .andExpect(jsonPath("$[?(@.userId == %d)].subtitle".formatted(startup.getId())).value("Logística • Seed"))
                .andExpect(content().string(not(containsString("\"email\""))))
                .andExpect(content().string(not(containsString(startup.getEmail()))));

        mockMvc.perform(get("/api/meetings/counterparts").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.userId == %d)].role".formatted(investor.getId())).value("INVESTOR"))
                .andExpect(content().string(not(containsString(investor.getEmail()))));
    }
}

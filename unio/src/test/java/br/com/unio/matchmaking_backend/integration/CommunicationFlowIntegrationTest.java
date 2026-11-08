package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** Fluxo completo de RF05 + RF10: conversa → mensagens → reunião → realização → avaliação. */
class CommunicationFlowIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private MeetingRepository meetingRepository;

    private User startup;
    private User investor;
    private String startupToken;
    private String investorToken;

    @BeforeEach
    void setUp() {
        startup = createUser(Role.STARTUP);
        investor = createUser(Role.INVESTOR);
        startupToken = bearer(startup);
        investorToken = bearer(investor);
    }

    @Test
    void conversaComMensagensELeitura() throws Exception {
        long conversationId = startConversation(investorToken, startup.getId());

        // Abrir de novo pelo outro lado devolve a mesma conversa
        mockMvc.perform(post("/api/conversations").header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participantId\":" + investor.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(conversationId));

        mockMvc.perform(post("/api/conversations/{id}/messages", conversationId)
                        .header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Olá! Gostei do pitch de vocês.\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mine").value(true));

        mockMvc.perform(get("/api/conversations").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(conversationId))
                .andExpect(jsonPath("$[0].unreadCount").value(1))
                .andExpect(jsonPath("$[0].lastMessagePreview").value("Olá! Gostei do pitch de vocês."))
                .andExpect(jsonPath("$[0].participant.role").value("INVESTOR"));

        mockMvc.perform(post("/api/conversations/{id}/read", conversationId)
                        .header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updated").value(1));

        mockMvc.perform(get("/api/conversations/{id}/messages", conversationId)
                        .header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].mine").value(false))
                .andExpect(jsonPath("$.content[0].readAt").isNotEmpty());
    }

    @Test
    void terceiroNaoLeConversaAlheia() throws Exception {
        long conversationId = startConversation(investorToken, startup.getId());
        String outsiderToken = bearer(createUser(Role.STARTUP));

        mockMvc.perform(get("/api/conversations/{id}/messages", conversationId)
                        .header(HttpHeaders.AUTHORIZATION, outsiderToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void reuniaoAceitaRealizadaEAvaliada() throws Exception {
        Instant startsAt = Instant.now().plus(Duration.ofDays(2)).truncatedTo(ChronoUnit.MINUTES);

        MvcResult created = mockMvc.perform(post("/api/meetings").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"participantId": %d, "title": "Primeira conversa",
                                 "agenda": "Tese e próximos passos", "startsAt": "%s",
                                 "durationMinutes": 30, "meetingUrl": "https://meet.example.com/unio"}
                                """.formatted(startup.getId(), startsAt)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.organizer").value(true))
                .andReturn();
        long meetingId = idFrom(created);

        // Mesmo horário para os mesmos participantes → conflito
        mockMvc.perform(post("/api/meetings").header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"participantId": %d, "title": "Duplicada", "startsAt": "%s", "durationMinutes": 30}
                                """.formatted(investor.getId(), startsAt.plus(Duration.ofMinutes(10)))))
                .andExpect(status().isConflict());

        // Organizador não pode aceitar o próprio convite
        mockMvc.perform(post("/api/meetings/{id}/accept", meetingId).header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/meetings/{id}/accept", meetingId).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADA"));

        // Ainda não aconteceu: não pode ser avaliada
        mockMvc.perform(post("/api/meetings/{id}/reviews", meetingId).header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5}"))
                .andExpect(status().isConflict());

        // Simula a passagem do tempo: a reunião passa a ter começado ontem
        Meeting meeting = meetingRepository.findById(meetingId).orElseThrow();
        meeting.setStartsAt(Instant.now().minus(Duration.ofDays(1)));
        meeting.setEndsAt(meeting.getStartsAt().plus(Duration.ofMinutes(30)));
        meetingRepository.saveAndFlush(meeting);

        mockMvc.perform(post("/api/meetings/{id}/complete", meetingId).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REALIZADA"));

        mockMvc.perform(post("/api/meetings/{id}/reviews", meetingId).header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"Investidor muito preparado\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewed.id").value(investor.getId()));

        mockMvc.perform(post("/api/meetings/{id}/reviews", meetingId).header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4}"))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/reviews/received").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalReviews").value(1))
                .andExpect(jsonPath("$.averageRating").value(5.0));
    }

    @Test
    void notaForaDaFaixaEhRecusadaComMensagemDoCampo() throws Exception {
        mockMvc.perform(post("/api/meetings/{id}/reviews", 1).header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":9}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("rating"))
                .andExpect(jsonPath("$.errors[0].defaultMessage").value("A nota máxima é 5"));
    }

    private long startConversation(String token, Long participantId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/conversations").header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participantId\":" + participantId + "}"))
                .andExpect(status().isOk())
                .andReturn();
        long id = idFrom(result);
        assertThat(id).isPositive();
        return id;
    }
}

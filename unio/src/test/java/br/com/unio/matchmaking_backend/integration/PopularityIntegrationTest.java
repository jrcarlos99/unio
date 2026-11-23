package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.popularity.repository.ProfileViewRepository;
import br.com.unio.matchmaking_backend.review.entity.InteractionReview;
import br.com.unio.matchmaking_backend.review.repository.InteractionReviewRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * RF10: resumo público (D040), visitas (D041), popularidade própria (D042) e comentário
 * gravado mas oculto em todas as respostas (D043). Postgres real (ON CONFLICT da V25).
 */
class PopularityIntegrationTest extends IntegrationTestSupport {

    private static final String COMENTARIO = "Comentario secreto para a moderacao";

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private InteractionReviewRepository reviewRepository;

    @Autowired
    private ProfileViewRepository profileViewRepository;

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

    // ------------------------------------------------------------------ D043

    @Test
    void comentarioEhGravadoMasNaoApareceEmNenhumaResposta() throws Exception {
        Meeting meeting = realizada(investor, startup);

        MvcResult created = mockMvc.perform(post("/api/meetings/{id}/reviews", meeting.getId())
                        .header(HttpHeaders.AUTHORIZATION, startupToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"" + COMENTARIO + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.comment").doesNotExist())
                .andReturn();
        assertThat(created.getResponse().getContentAsString()).doesNotContain(COMENTARIO);

        // Gravado no banco
        InteractionReview saved = reviewRepository.findById(idFrom(created)).orElseThrow();
        assertThat(saved.getComment()).isEqualTo(COMENTARIO);

        // Autor e avaliado listando a reunião
        for (String token : new String[] {startupToken, investorToken}) {
            MvcResult list = mockMvc.perform(get("/api/meetings/{id}/reviews", meeting.getId())
                            .header(HttpHeaders.AUTHORIZATION, token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].rating").value(5))
                    .andExpect(jsonPath("$[0].comment").doesNotExist())
                    .andReturn();
            assertThat(list.getResponse().getContentAsString()).doesNotContain(COMENTARIO);
        }

        // Avaliado vendo as recebidas
        MvcResult received = mockMvc.perform(get("/api/reviews/received").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalReviews").value(1))
                .andExpect(jsonPath("$.reviews[0].comment").doesNotExist())
                .andReturn();
        assertThat(received.getResponse().getContentAsString()).doesNotContain(COMENTARIO);

        // Resumo público e popularidade própria
        for (MvcResult result : new MvcResult[] {
                mockMvc.perform(get("/api/reviews/summary/{id}", investor.getId())
                        .header(HttpHeaders.AUTHORIZATION, startupToken)).andExpect(status().isOk()).andReturn(),
                mockMvc.perform(get("/api/profile/me/popularity")
                        .header(HttpHeaders.AUTHORIZATION, investorToken)).andExpect(status().isOk()).andReturn()}) {
            assertThat(result.getResponse().getContentAsString()).doesNotContain(COMENTARIO).doesNotContain("comment");
        }
    }

    // ------------------------------------------------------------------ D040

    @Test
    void resumoNuloAbaixoDoMinimoEVisivelComTresAvaliacoes() throws Exception {
        // 0 avaliações
        mockMvc.perform(get("/api/reviews/summary/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(startup.getId()))
                .andExpect(jsonPath("$.totalReviews").value(0))
                .andExpect(jsonPath("$.averageRating").doesNotExist())
                .andExpect(jsonPath("$.percentage").doesNotExist())
                .andExpect(jsonPath("$.visible").value(false));

        // 2 avaliações (5 e 4): ainda oculto
        avaliar(startup, 5);
        avaliar(startup, 4);
        mockMvc.perform(get("/api/reviews/summary/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalReviews").value(2))
                .andExpect(jsonPath("$.averageRating").doesNotExist())
                .andExpect(jsonPath("$.percentage").doesNotExist())
                .andExpect(jsonPath("$.visible").value(false));

        // 3 avaliações (5, 4, 5): média 4,7 e 93%
        avaliar(startup, 5);
        MvcResult result = mockMvc.perform(get("/api/reviews/summary/{id}", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalReviews").value(3))
                .andExpect(jsonPath("$.averageRating").value(4.7))
                .andExpect(jsonPath("$.percentage").value(93))
                .andExpect(jsonPath("$.visible").value(true))
                .andReturn();
        // Nada além dos agregados
        assertThat(result.getResponse().getContentAsString())
                .doesNotContain("reviewer")
                .doesNotContain("comment");
    }

    @Test
    void resumoDePapelErradoResponde404EOProprioPodeConsultar() throws Exception {
        User outraStartup = createUser(Role.STARTUP);

        mockMvc.perform(get("/api/reviews/summary/{id}", outraStartup.getId()).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/reviews/summary/{id}", 999_999_999L).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/reviews/summary/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(startup.getId()));
    }

    // ------------------------------------------------------------------ D041

    @Test
    void visitaDuplicadaNoMesmoDiaContaUmaVez() throws Exception {
        visitar(investorToken, startup.getId());
        visitar(investorToken, startup.getId());
        visitar(investorToken, startup.getId());

        assertThat(profileViewRepository.countByTargetUserId(startup.getId())).isEqualTo(1);
        mockMvc.perform(get("/api/profile/me/popularity").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profileViews28d").value(1));
    }

    @Test
    void autoVisitaEVisitaEntreMesmoPapelSaoIgnoradas() throws Exception {
        User outraStartup = createUser(Role.STARTUP);

        visitar(startupToken, startup.getId());
        visitar(bearer(outraStartup), startup.getId());

        assertThat(profileViewRepository.countByTargetUserId(startup.getId())).isZero();
    }

    @Test
    void visitaAPerfilInexistenteResponde404() throws Exception {
        mockMvc.perform(post("/api/profile-views").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\": 999999999}"))
                .andExpect(status().isNotFound());
    }

    // ------------------------------------------------------------------ D042

    @Test
    void popularidadePropriaTrazAgregadosSemExporVisitantes() throws Exception {
        avaliar(startup, 5);
        avaliar(startup, 5);
        avaliar(startup, 4);
        visitar(investorToken, startup.getId());

        MvcResult result = mockMvc.perform(get("/api/profile/me/popularity").header(HttpHeaders.AUTHORIZATION, startupToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(startup.getId()))
                .andExpect(jsonPath("$.totalReviews").value(3))
                .andExpect(jsonPath("$.percentage").value(93))
                .andExpect(jsonPath("$.visible").value(true))
                .andExpect(jsonPath("$.meetingsCompleted").value(3))
                .andExpect(jsonPath("$.profileViews28d").value(1))
                .andExpect(jsonPath("$.profileViewsPrev28d").value(0))
                .andExpect(jsonPath("$.weeklyViews.length()").value(4))
                .andExpect(jsonPath("$.weeklyViews[3].views").value(1))
                .andExpect(jsonPath("$.interestsReceived").value(0))
                .andReturn();
        assertThat(result.getResponse().getContentAsString())
                .doesNotContain("viewer")
                .doesNotContain(investor.getEmail());
    }

    // ------------------------------------------------------------------ apoio

    /** Uma reunião REALIZADA entre os dois, já no passado (o back exige o horário de início). */
    private Meeting realizada(User organizer, User invitee) {
        Instant start = Instant.now().minus(Duration.ofDays(1)).truncatedTo(ChronoUnit.MINUTES);
        Meeting meeting = Meeting.builder()
                .organizer(organizer)
                .invitee(invitee)
                .proposer(organizer)
                .title("Conversa")
                .startsAt(start)
                .endsAt(start.plus(Duration.ofMinutes(30)))
                .status(MeetingStatus.REALIZADA)
                .build();
        meeting.replaceSuggestedTimes(java.util.List.of(start));
        return meetingRepository.saveAndFlush(meeting);
    }

    /** Um investidor novo avalia {@code reviewed} numa reunião realizada, pela API. */
    private void avaliar(User reviewed, int rating) throws Exception {
        User reviewer = createUser(Role.INVESTOR);
        Meeting meeting = realizada(reviewer, reviewed);
        mockMvc.perform(post("/api/meetings/{id}/reviews", meeting.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(reviewer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":" + rating + "}"))
                .andExpect(status().isCreated());
    }

    private void visitar(String token, Long targetUserId) throws Exception {
        mockMvc.perform(post("/api/profile-views").header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\":" + targetUserId + "}"))
                .andExpect(status().isNoContent());
    }
}

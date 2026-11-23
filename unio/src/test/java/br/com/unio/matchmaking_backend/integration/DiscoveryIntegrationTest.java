package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * D045 a D048: descoberta com score sob demanda. O banco de desenvolvimento pode ter
 * outros usuários, então as asserções olham só para os criados aqui (por userId) e
 * para a ordem da lista inteira.
 */
class DiscoveryIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private StartupRepository startupRepository;

    @Autowired
    private InvestorRepository investorRepository;

    @Autowired
    private MatchScoreRepository matchScoreRepository;

    @Autowired
    private EntityManager entityManager;

    private User investor;
    private User goodStartup;
    private User weakStartup;
    private User criticalStartup;
    private User startupWithoutProfile;
    private String investorToken;

    @BeforeEach
    void setUp() {
        investor = createUser(Role.INVESTOR);
        investorRepository.save(Investor.builder()
                .user(investor)
                .segmentosInteresse("Logística,Fintech")
                .estagiosInteresse("Seed")
                .ticketMinimo(new BigDecimal("100000"))
                .ticketMaximo(new BigDecimal("500000"))
                .regiaoInteresse("Nordeste")
                .perfilRisco("Investidor Anjo")
                .build());

        // 92.5: segmento, estágio, capital e região (Nordeste + PE) batem
        goodStartup = startup("Tidalog Teste " + UUID.randomUUID(), "Logística", "Seed", "Recife, PE",
                new BigDecimal("300000"));
        // 32.5: só o capital bate
        weakStartup = startup("Saude Teste " + UUID.randomUUID(), "Saúde", "Série A", "São Paulo, SP",
                new BigDecimal("300000"));
        // Capital muito acima do ticket: critério CRITICAL violado
        criticalStartup = startup("Critica Teste " + UUID.randomUUID(), "Logística", "Seed", "Recife, PE",
                new BigDecimal("5000000"));
        startupWithoutProfile = createUser(Role.STARTUP);
        entityManager.flush();

        investorToken = bearer(investor);
    }

    private User startup(String nome, String segmento, String estagio, String localizacao, BigDecimal capital) {
        User user = createUser(Role.STARTUP);
        startupRepository.save(Startup.builder()
                .user(user)
                .nome(nome)
                .segmento(segmento)
                .estagio(estagio)
                .localizacao(localizacao)
                .modeloNegocio("B2B")
                .mercadoAlvo("Empresas")
                .capitalProcurado(capital)
                .build());
        return user;
    }

    private MvcResult listStartups(String query) throws Exception {
        return mockMvc.perform(get("/api/discovery/startups" + query)
                        .param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andReturn();
    }

    private static List<Map<String, Object>> items(MvcResult result) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), "$.items");
    }

    private static Map<String, Object> itemOf(List<Map<String, Object>> items, User user) {
        return items.stream()
                .filter(item -> ((Number) item.get("userId")).longValue() == user.getId())
                .findFirst()
                .orElse(null);
    }

    private List<MatchScore> storedScores(User startup) {
        return matchScoreRepository.findAllByInvestorIdAndStartupId(
                new UUID(0L, investor.getId()), new UUID(0L, startup.getId()));
    }

    @Test
    void scoreCriadoNaPrimeiraLeituraEReaproveitadoNaSegunda() throws Exception {
        assertThat(storedScores(goodStartup)).isEmpty();

        Map<String, Object> first = itemOf(items(listStartups("")), goodStartup);
        assertThat(first).isNotNull();
        assertThat(new BigDecimal(first.get("scoreFinal").toString())).isEqualByComparingTo("92.5");
        assertThat(first.get("classification")).isEqualTo("EXCELENTE");
        assertThat(storedScores(goodStartup)).hasSize(1);
        Instant calculatedAt = storedScores(goodStartup).get(0).getCalculatedAt();

        Map<String, Object> second = itemOf(items(listStartups("")), goodStartup);
        assertThat(second.get("calculatedAt")).isEqualTo(first.get("calculatedAt"));
        assertThat(storedScores(goodStartup)).hasSize(1);
        assertThat(storedScores(goodStartup).get(0).getCalculatedAt()).isEqualTo(calculatedAt);
    }

    @Test
    void perfilAlteradoDepoisDoCalculoRecalculaOScore() throws Exception {
        listStartups("");
        Instant before = storedScores(goodStartup).get(0).getCalculatedAt();

        Startup profile = startupRepository.findById(goodStartup.getId()).orElseThrow();
        profile.setEstagio("Série A");
        startupRepository.saveAndFlush(profile);

        Map<String, Object> item = itemOf(items(listStartups("")), goodStartup);
        // Estágio deixou de bater: 92.5 - 20
        assertThat(new BigDecimal(item.get("scoreFinal").toString())).isEqualByComparingTo("72.5");
        assertThat(storedScores(goodStartup).get(0).getCalculatedAt()).isAfter(before);
    }

    @Test
    void listaOrdenadaPorScoreComCriticoComoSemMatchESemPerfilFora() throws Exception {
        List<Map<String, Object>> items = items(listStartups(""));

        List<BigDecimal> scores = items.stream().map(item -> new BigDecimal(item.get("scoreFinal").toString())).toList();
        for (int i = 1; i < scores.size(); i++) {
            assertThat(scores.get(i - 1)).isGreaterThanOrEqualTo(scores.get(i));
        }

        Map<String, Object> critical = itemOf(items, criticalStartup);
        assertThat(critical).isNotNull();
        assertThat(new BigDecimal(critical.get("scoreFinal").toString())).isEqualByComparingTo("0");
        assertThat(critical.get("classification")).isEqualTo("SEM_MATCH");
        assertThat(storedScores(criticalStartup)).as("critério eliminatório não é gravado").isEmpty();

        assertThat(items.indexOf(itemOf(items, goodStartup))).isLessThan(items.indexOf(itemOf(items, weakStartup)));
        assertThat(items.indexOf(itemOf(items, weakStartup))).isLessThan(items.indexOf(critical));
        assertThat(itemOf(items, startupWithoutProfile)).as("usuário sem perfil fica fora").isNull();
    }

    @Test
    void filtrosDeSegmentoBuscaEScoreMinimo() throws Exception {
        List<Map<String, Object>> bySegment = items(listStartups("?segmento=logistica"));
        assertThat(itemOf(bySegment, goodStartup)).isNotNull();
        assertThat(itemOf(bySegment, weakStartup)).isNull();

        String name = startupRepository.findById(goodStartup.getId()).orElseThrow().getNome();
        List<Map<String, Object>> byName = items(listStartups("?q=" + name.substring(0, 18).toLowerCase()));
        assertThat(itemOf(byName, goodStartup)).isNotNull();
        assertThat(itemOf(byName, weakStartup)).isNull();

        List<Map<String, Object>> byScore = items(listStartups("?minScore=50"));
        assertThat(itemOf(byScore, goodStartup)).isNotNull();
        assertThat(itemOf(byScore, weakStartup)).isNull();
        assertThat(itemOf(byScore, criticalStartup)).isNull();
    }

    @Test
    void nenhumCampoSensivelNoJson() throws Exception {
        String list = listStartups("").getResponse().getContentAsString();
        String detail = mockMvc.perform(get("/api/discovery/startups/{id}", goodStartup.getId())
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.segmento").value("Logística"))
                .andExpect(jsonPath("$.dimensions").isArray())
                .andExpect(jsonPath("$.scorecard.scorePolicyId").isNumber())
                .andExpect(jsonPath("$.interestStatus").value("NONE"))
                .andExpect(jsonPath("$.saved").value(false))
                .andReturn().getResponse().getContentAsString();

        for (String json : List.of(list, detail)) {
            assertThat(json).doesNotContain(goodStartup.getEmail())
                    .doesNotContain("\"email\"")
                    .doesNotContain("documento")
                    .doesNotContain("password")
                    .doesNotContain("respostas")
                    .doesNotContain("pitchFileUrl");
        }
    }

    @Test
    void papelErradoRecebe403() throws Exception {
        mockMvc.perform(get("/api/discovery/startups").header(HttpHeaders.AUTHORIZATION, bearer(goodStartup)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/discovery/investors").header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/discovery/investors/{id}", investor.getId())
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void startupVeOInvestidorEContaSemPerfilRecebe409() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/discovery/investors")
                        .param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, bearer(goodStartup)))
                .andExpect(status().isOk())
                .andReturn();
        Map<String, Object> item = itemOf(items(result), investor);
        assertThat(item).isNotNull();
        assertThat(item.get("role")).isEqualTo("INVESTOR");

        mockMvc.perform(get("/api/discovery/investors").header(HttpHeaders.AUTHORIZATION, bearer(startupWithoutProfile)))
                .andExpect(status().isConflict());
    }

    @Test
    void detalheDeStartupInexistenteOuSemPerfilRecebe404() throws Exception {
        mockMvc.perform(get("/api/discovery/startups/{id}", startupWithoutProfile.getId())
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void feedbackSoNoProprioPar() throws Exception {
        Map<String, Object> item = itemOf(items(listStartups("")), goodStartup);
        @SuppressWarnings("unchecked")
        Map<String, Object> scorecard = (Map<String, Object>) item.get("scorecard");
        String body = """
                {"startupId": "%s", "investorId": "%s", "scorePolicyId": %s, "action": "VIEWED"}
                """.formatted(scorecard.get("startupId"), scorecard.get("investorId"), scorecard.get("scorePolicyId"));

        mockMvc.perform(post("/api/scorecard/feedback").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        // Repetido em menos de 5 minutos: 409 FEEDBACK_DUPLICATE (o front trata como sucesso)
        mockMvc.perform(post("/api/scorecard/feedback").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());

        // D048: outro investidor não grava feedback em nome deste par
        User otherInvestor = createUser(Role.INVESTOR);
        mockMvc.perform(post("/api/scorecard/feedback").header(HttpHeaders.AUTHORIZATION, bearer(otherInvestor))
                        .contentType(MediaType.APPLICATION_JSON).content(body.replace("VIEWED", "INTERESTED")))
                .andExpect(status().isForbidden());
        // A startup do par pode gravar (lado dela)
        mockMvc.perform(post("/api/scorecard/feedback").header(HttpHeaders.AUTHORIZATION, bearer(goodStartup))
                        .contentType(MediaType.APPLICATION_JSON).content(body.replace("VIEWED", "NOT_INTERESTED")))
                .andExpect(status().isCreated());
    }

    @Test
    void scorecardNaoAceitaIdsDeOutroUsuario() throws Exception {
        String other = new UUID(0L, createUser(Role.INVESTOR).getId()).toString();
        String mine = new UUID(0L, investor.getId()).toString();
        String startupId = new UUID(0L, goodStartup.getId()).toString();

        mockMvc.perform(get("/api/scorecard/recommendations").param("investorId", other)
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/scorecard/recommendations").param("investorId", mine)
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/scorecard/{startupId}/explanation", startupId).param("investorId", other)
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/scorecard/calculate").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startupId\": \"%s\", \"investorId\": \"%s\"}".formatted(startupId, other)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/scorecard/calculate").header(HttpHeaders.AUTHORIZATION, investorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startupId\": \"%s\", \"investorId\": \"%s\"}".formatted(startupId, mine)))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/scorecard/{startupId}/explanation", startupId).param("investorId", mine)
                        .header(HttpHeaders.AUTHORIZATION, investorToken))
                .andExpect(status().isOk());
    }
}

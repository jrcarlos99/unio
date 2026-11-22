package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModerationStatus;
import br.com.unio.matchmaking_backend.moderation.repository.AccountModerationRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * D063 (RF08, RNF10): moderação de cadastros pelo ADMIN, com os padrões das propriedades
 * (cadastro-requer-aprovacao=false). Cobre os ganchos no login e na visibilidade.
 */
class ModeracaoContasIntegrationTest extends ModeracaoTestSupport {

    @Autowired
    private AccountModerationRepository moderationRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    private User admin;
    private User startup;
    private User investor;

    @BeforeEach
    void setUp() {
        admin = createUser(Role.ADMIN);
        startup = createStartupWithProfile();
        investor = createInvestorWithProfile();
        novaRequisicao();
    }

    private String accountPath(User user, String action) {
        return "/api/admin/moderation/accounts/" + user.getId() + "/" + action;
    }

    private List<Integer> discoveredStartupIds() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/discovery/startups").param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.items[*].userId");
    }

    // ------------------------------------------------------------
    // Aprovar, recusar, login
    // ------------------------------------------------------------

    @Test
    void contaSemRegistroValeAprovadoERecusarBloqueiaLoginAteReaprovar() throws Exception {
        // Sem registro: APROVADO e login normal
        mockMvc.perform(get("/api/admin/moderation/accounts").param("q", startup.getEmail())
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].userId").value(startup.getId()))
                .andExpect(jsonPath("$.items[0].status").value("APROVADO"))
                .andExpect(jsonPath("$.items[0].role").value("STARTUP"))
                .andExpect(jsonPath("$.items[0].profileComplete").value(true));
        login(startup, DEFAULT_PASSWORD).andExpect(status().isOk());

        adminAction(admin, accountPath(startup, "reject"), "Documentos inconsistentes")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RECUSADO"))
                .andExpect(jsonPath("$.reason").value("Documentos inconsistentes"))
                .andExpect(jsonPath("$.reviewedBy").value(admin.getEmail()));
        novaRequisicao();

        login(startup, DEFAULT_PASSWORD)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Conta recusada pela moderação"));

        adminAction(admin, accountPath(startup, "approve"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APROVADO"))
                .andExpect(jsonPath("$.reason").doesNotExist());
        novaRequisicao();
        login(startup, DEFAULT_PASSWORD).andExpect(status().isOk());
    }

    @Test
    void loginDeContaSuspensaSoRespondeDepoisDaSenhaConferir() throws Exception {
        adminAction(admin, accountPath(investor, "suspend"), "Spam em mensagens").andExpect(status().isOk());
        novaRequisicao();

        // Senha errada: o mesmo 401 de sempre, sem revelar a situação da conta
        login(investor, "senhaErrada999")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Credenciais inválidas"));
        login(investor, DEFAULT_PASSWORD)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Conta suspensa"));
    }

    // ------------------------------------------------------------
    // Descoberta, perfil público, contrapartes, reativação
    // ------------------------------------------------------------

    @Test
    void contaSuspensaSomeDaDescobertaEDoPerfilPublicoEVoltaAoReativar() throws Exception {
        createMatch(startup, investor);
        novaRequisicao();
        assertThat(discoveredStartupIds()).contains(startup.getId().intValue());

        adminAction(admin, accountPath(startup, "suspend"), "Investigação de fraude").andExpect(status().isOk());
        novaRequisicao();

        assertThat(discoveredStartupIds()).doesNotContain(startup.getId().intValue());
        mockMvc.perform(get("/api/discovery/startups/{id}", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/profile/startup/{id}", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/meetings/counterparts").header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].userId", not(hasItem(startup.getId().intValue()))));

        adminAction(admin, accountPath(startup, "reactivate"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APROVADO"));
        novaRequisicao();

        assertThat(discoveredStartupIds()).contains(startup.getId().intValue());
        mockMvc.perform(get("/api/profile/startup/{id}", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isOk());
        // O match não foi apagado: a contraparte volta
        mockMvc.perform(get("/api/meetings/counterparts").header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].userId", hasItem(startup.getId().intValue())));
    }

    @Test
    void recusarCancelaReunioesFuturasComMotivoSemApagarOMatch() throws Exception {
        createMatch(startup, investor);
        Instant inicio = Instant.now().plus(Duration.ofDays(20)).truncatedTo(ChronoUnit.HOURS);
        MvcResult created = mockMvc.perform(post("/api/meetings").header(HttpHeaders.AUTHORIZATION, bearer(investor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"participantId": %d, "subject": "Conversa", "durationMinutes": 30,
                                 "suggestedTimes": ["%s"]}
                                """.formatted(startup.getId(), inicio)))
                .andExpect(status().isCreated())
                .andReturn();
        long meetingId = idFrom(created);
        mockMvc.perform(post("/api/meetings/{id}/accept", meetingId).header(HttpHeaders.AUTHORIZATION, bearer(startup)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADA"));
        novaRequisicao();

        adminAction(admin, accountPath(startup, "reject"), "Cadastro falso").andExpect(status().isOk());
        novaRequisicao();

        Meeting meeting = meetingRepository.findById(meetingId).orElseThrow();
        assertThat(meeting.getStatus()).isEqualTo(MeetingStatus.CANCELADA);
        assertThat(meeting.getCancelReason()).isEqualTo("Reunião cancelada porque a conta foi recusada pela moderação");
        // Matches não são apagados
        assertThat(matchInterestRepository.existsActive(startup.getId(), investor.getId())).isTrue();
        assertThat(matchInterestRepository.existsActive(investor.getId(), startup.getId())).isTrue();
    }

    // ------------------------------------------------------------
    // Regras: a si mesmo, outro ADMIN, 404, 409, idempotência, motivo
    // ------------------------------------------------------------

    @Test
    void adminNaoModeraASiMesmoNemOutroAdmin() throws Exception {
        User outroAdmin = createUser(Role.ADMIN);
        adminAction(admin, accountPath(admin, "suspend"), "Teste de regra")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Você não pode moderar a própria conta"));
        adminAction(admin, accountPath(outroAdmin, "reject"), "Teste de regra")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("A conta de um administrador não pode ser moderada"));
        adminAction(admin, "/api/admin/moderation/accounts/999999999/approve", null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Usuário não encontrado"));
        assertThat(moderationRepository.findById(admin.getId())).isEmpty();
        assertThat(moderationRepository.findById(outroAdmin.getId())).isEmpty();
        // O ADMIN continua entrando
        login(admin, DEFAULT_PASSWORD).andExpect(status().isOk());
    }

    @Test
    void contaExcluidaPeloTitularNaoEModerada() throws Exception {
        mockMvc.perform(post("/api/privacy/delete-account").header(HttpHeaders.AUTHORIZATION, bearer(investor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\": \"%s\", \"confirmed\": true}".formatted(DEFAULT_PASSWORD)))
                .andExpect(status().is2xxSuccessful());
        novaRequisicao();
        adminAction(admin, accountPath(investor, "suspend"), "Teste de regra")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("A conta foi excluída pelo titular e não pode ser moderada"));
    }

    @Test
    void estadoRepetidoEIdempotenteEVaiParaAAuditoria() throws Exception {
        adminAction(admin, accountPath(startup, "suspend"), "Primeiro motivo").andExpect(status().isOk());
        novaRequisicao();
        adminAction(admin, accountPath(startup, "suspend"), "Segundo motivo")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENSO"))
                .andExpect(jsonPath("$.reason").value("Primeiro motivo"));
        adminAction(admin, accountPath(investor, "approve"), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APROVADO"));
        // Aprovar quem já está aprovado não cria registro de moderação
        assertThat(moderationRepository.findById(investor.getId())).isEmpty();
        assertThat(moderationRepository.findById(startup.getId()).orElseThrow().getStatus())
                .isEqualTo(AccountModerationStatus.SUSPENSO);
    }

    @Test
    void motivoEObrigatorioDe3a255Caracteres() throws Exception {
        mockMvc.perform(post(accountPath(startup, "reject")).header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isBadRequest());
        adminAction(admin, accountPath(startup, "reject"), "ab")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Informe o motivo, com 3 a 255 caracteres"));
        adminAction(admin, accountPath(startup, "suspend"), "   ab   ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Informe o motivo, com 3 a 255 caracteres"));
        adminAction(admin, accountPath(startup, "suspend"), "x".repeat(256))
                .andExpect(status().isBadRequest());
        assertThat(moderationRepository.findById(startup.getId())).isEmpty();
    }

    @Test
    void quemNaoEAdminRecebe403EmTodasAsRotasDeModeracao() throws Exception {
        for (User user : List.of(startup, investor)) {
            String token = bearer(user);
            mockMvc.perform(get("/api/admin/moderation/accounts").header(HttpHeaders.AUTHORIZATION, token))
                    .andExpect(status().isForbidden());
            mockMvc.perform(get("/api/admin/moderation/content").header(HttpHeaders.AUTHORIZATION, token))
                    .andExpect(status().isForbidden());
            mockMvc.perform(post(accountPath(user, "approve")).header(HttpHeaders.AUTHORIZATION, token))
                    .andExpect(status().isForbidden());
            mockMvc.perform(post("/api/admin/moderation/content/1/approve").header(HttpHeaders.AUTHORIZATION, token))
                    .andExpect(status().isForbidden());
        }
        mockMvc.perform(get("/api/admin/moderation/accounts")).andExpect(status().isUnauthorized());
        assertThat(moderationRepository.findById(startup.getId())).isEmpty();
    }

    // ------------------------------------------------------------
    // Lista
    // ------------------------------------------------------------

    @Test
    void listaFiltraPorSituacaoPerfilEBuscaComSuspensosAntesDosAprovados() throws Exception {
        User semPerfil = createUser(Role.INVESTOR);
        adminAction(admin, accountPath(investor, "suspend"), "Teste de lista").andExpect(status().isOk());
        novaRequisicao();

        MvcResult all = mockMvc.perform(get("/api/admin/moderation/accounts").param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andReturn();
        List<Map<String, Object>> items = JsonPath.read(all.getResponse().getContentAsString(), "$.items");
        // ADMIN não aparece; o suspenso vem antes de qualquer aprovado
        assertThat(items).noneMatch(item -> "ADMIN".equals(item.get("role")));
        List<String> statuses = items.stream().map(item -> (String) item.get("status")).toList();
        int firstApproved = statuses.indexOf("APROVADO");
        int suspended = statuses.indexOf("SUSPENSO");
        assertThat(suspended).isGreaterThanOrEqualTo(0);
        assertThat(firstApproved).isGreaterThan(suspended);

        mockMvc.perform(get("/api/admin/moderation/accounts").param("status", "SUSPENSO").param("role", "INVESTOR")
                        .param("q", investor.getEmail().toUpperCase())
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].userId").value(investor.getId()))
                .andExpect(jsonPath("$.items[0].reason").value("Teste de lista"));
        mockMvc.perform(get("/api/admin/moderation/accounts").param("q", semPerfil.getEmail())
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(jsonPath("$.items[0].profileComplete").value(false));
        mockMvc.perform(get("/api/admin/moderation/accounts").param("status", "PENDENTE,RECUSADO")
                        .param("q", investor.getEmail())
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(jsonPath("$.total").value(0));
        mockMvc.perform(get("/api/admin/moderation/accounts").param("role", "ADMIN")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Perfil inválido: use STARTUP ou INVESTOR"));
        mockMvc.perform(get("/api/admin/moderation/accounts").param("status", "QUALQUER")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------
    // Auditoria (RNF10)
    // ------------------------------------------------------------

    @Test
    void cadaAcaoGravaNoLogDeAuditoriaExistenteSemDadosSensiveis() throws Exception {
        adminAction(admin, accountPath(startup, "suspend"), "Motivo auditado").andExpect(status().isOk());
        adminAction(admin, accountPath(startup, "reactivate"), null).andExpect(status().isOk());
        adminAction(admin, accountPath(investor, "reject"), "Cadastro duplicado").andExpect(status().isOk());
        adminAction(admin, accountPath(investor, "approve"), null).andExpect(status().isOk());
        novaRequisicao();

        MvcResult audit = mockMvc.perform(get("/api/admin/audit").header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andReturn();
        String body = audit.getResponse().getContentAsString();
        List<Map<String, Object>> rows = JsonPath.read(body, "$[?(@.actorEmail == '" + admin.getEmail() + "')]");
        assertThat(rows).extracting(row -> row.get("action")).contains(
                "MODERACAO_CONTA_SUSPENSA", "MODERACAO_CONTA_REATIVADA",
                "MODERACAO_CONTA_RECUSADA", "MODERACAO_CONTA_APROVADA");
        Map<String, Object> suspended = rows.stream()
                .filter(row -> "MODERACAO_CONTA_SUSPENSA".equals(row.get("action")))
                .findFirst().orElseThrow();
        // Mesmo formato de sempre do GET /api/admin/audit
        assertThat(suspended).containsOnlyKeys("id", "actorEmail", "action", "entityType", "entityId", "details",
                "createdAt");
        assertThat(suspended.get("entityType")).isEqualTo("User");
        assertThat(suspended.get("entityId")).isEqualTo(String.valueOf(startup.getId()));
        assertThat((String) suspended.get("details")).contains("Motivo: Motivo auditado")
                .contains("Situação anterior: APROVADO");
        // Sem senha, hash ou e-mail da conta moderada
        assertThat(body).doesNotContain(DEFAULT_PASSWORD).doesNotContain("$2a$").doesNotContain(startup.getEmail());
    }

    // ------------------------------------------------------------
    // Contrato das rotas com gancho: iguais para contas aprovadas
    // ------------------------------------------------------------

    @Test
    void loginECadastroDeContaComumSeguemComOMesmoContrato() throws Exception {
        MvcResult loginResult = login(startup, DEFAULT_PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(startup.getEmail()))
                .andExpect(jsonPath("$.role").value("STARTUP"))
                .andExpect(jsonPath("$.token").isString())
                .andReturn();
        Map<String, Object> loginBody = JsonPath.read(loginResult.getResponse().getContentAsString(), "$");
        assertThat(loginBody).containsOnlyKeys("token", "email", "role");

        String email = "moderacao-contrato-" + System.nanoTime() + "@teste.unio";
        String documento = String.valueOf(System.nanoTime()).substring(0, 11);
        MvcResult register = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "%s", "password": "%s", "role": "INVESTOR",
                                 "documento": "%s", "acceptedTerms": true}
                                """.formatted(email, DEFAULT_PASSWORD, documento)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("INVESTOR"))
                .andReturn();
        Map<String, Object> registerBody = JsonPath.read(register.getResponse().getContentAsString(), "$");
        assertThat(registerBody).containsOnlyKeys("token", "email", "role");
        novaRequisicao();
        // Padrão (cadastro-requer-aprovacao=false): nada gravado na moderação, conta entra APROVADO
        User created = userRepository.findByEmail(email).orElseThrow();
        assertThat(moderationRepository.findById(created.getId())).isEmpty();
        mockMvc.perform(get("/api/admin/moderation/accounts").param("q", email)
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(jsonPath("$.items[0].status").value("APROVADO"));
    }

    @Test
    void rotasAntigasDoAdminContinuamComoAntes() throws Exception {
        mockMvc.perform(get("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].status").doesNotExist());
        mockMvc.perform(get("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearer(startup)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("negado")));
    }
}

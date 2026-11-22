package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.moderation.repository.StartupPitchPublicationRepository;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

/**
 * D063 (RF06, RF08): envio do pitch e do Lean Canvas, revisão pelo ADMIN e leitura pelo
 * investidor, com o padrão pitch-requer-aprovacao=true.
 */
class PitchPublicacaoIntegrationTest extends ModeracaoTestSupport {

    @Autowired
    private StartupPitchPublicationRepository publicationRepository;

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

    private ResultActions publishedPitch(User viewer, User target) throws Exception {
        return mockMvc.perform(get("/api/discovery/startups/{id}/pitch", target.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(viewer)));
    }

    private ResultActions ownStatus(User owner) throws Exception {
        return mockMvc.perform(get("/api/profile/startup/pitch/publication")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner)));
    }

    private long submitAndGetId(User owner) throws Exception {
        MvcResult result = submitPitch(owner).andExpect(status().isOk()).andReturn();
        novaRequisicao();
        return idFrom(result);
    }

    // ------------------------------------------------------------
    // Fluxo com revisão
    // ------------------------------------------------------------

    @Test
    void envioFicaEmRevisaoEOInvestidorSoVeDepoisDeAprovado() throws Exception {
        ownStatus(startup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.requiresApproval").value(true));

        savePitch(startup, "Logística inteligente para o Nordeste", "https://youtu.be/dQw4w9WgXcQ", "Frete caro");
        submitPitch(startup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EM_REVISAO"))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.shortPitch").value("Logística inteligente para o Nordeste"))
                .andExpect(jsonPath("$.leanCanvas.problem").value("Frete caro"));
        novaRequisicao();

        ownStatus(startup).andExpect(jsonPath("$.status").value("EM_REVISAO"));
        publishedPitch(investor, startup)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Esta startup ainda não publicou o pitch"));

        MvcResult queue = mockMvc.perform(get("/api/admin/moderation/content").param("status", "EM_REVISAO")
                        .param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andReturn();
        List<Map<String, Object>> items = JsonPath.read(queue.getResponse().getContentAsString(),
                "$.items[?(@.startupId == " + startup.getId() + ")]");
        assertThat(items).hasSize(1);
        Map<String, Object> item = items.get(0);
        assertThat(item.get("current")).isEqualTo(true);
        assertThat(item.get("shortPitch")).isEqualTo("Logística inteligente para o Nordeste");
        assertThat(item.get("videoUrl")).isEqualTo("https://youtu.be/dQw4w9WgXcQ");
        assertThat(((Map<?, ?>) item.get("leanCanvas")).get("revenueStreams")).isEqualTo("Assinatura mensal");
        long id = ((Number) item.get("id")).longValue();

        adminAction(admin, "/api/admin/moderation/content/" + id + "/approve", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLICADO"))
                .andExpect(jsonPath("$.reviewedBy").value(admin.getEmail()));
        novaRequisicao();

        publishedPitch(investor, startup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startupId").value(startup.getId()))
                .andExpect(jsonPath("$.shortPitch").value("Logística inteligente para o Nordeste"))
                .andExpect(jsonPath("$.videoUrl").value("https://youtu.be/dQw4w9WgXcQ"))
                .andExpect(jsonPath("$.leanCanvas.solution").value("Roteirização com IA"))
                .andExpect(jsonPath("$.publishedAt").exists());
        // A própria startup e o ADMIN também leem; outra startup não
        publishedPitch(startup, startup).andExpect(status().isOk());
        publishedPitch(admin, startup).andExpect(status().isOk());
        publishedPitch(createStartupWithProfile(), startup).andExpect(status().isForbidden());
        ownStatus(startup).andExpect(jsonPath("$.status").value("PUBLICADO"));
    }

    @Test
    void removerEscondeDoPublicoMostraOMotivoEReenviarSubstitui() throws Exception {
        savePitch(startup, "Primeira versão", null, "Problema antigo");
        long v1 = submitAndGetId(startup);
        adminAction(admin, "/api/admin/moderation/content/" + v1 + "/approve", null).andExpect(status().isOk());
        novaRequisicao();
        publishedPitch(investor, startup).andExpect(status().isOk());

        adminAction(admin, "/api/admin/moderation/content/" + v1 + "/remove", "Contém telefone pessoal")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REMOVIDO"))
                .andExpect(jsonPath("$.reason").value("Contém telefone pessoal"));
        novaRequisicao();
        publishedPitch(investor, startup).andExpect(status().isNotFound());
        ownStatus(startup)
                .andExpect(jsonPath("$.status").value("REMOVIDO"))
                .andExpect(jsonPath("$.reason").value("Contém telefone pessoal"));

        // Reenvio: versão 2 em revisão; a versão 1 fica no histórico e não aceita mais ação
        savePitch(startup, "Segunda versão", null, "Problema novo");
        long v2 = submitAndGetId(startup);
        ownStatus(startup)
                .andExpect(jsonPath("$.status").value("EM_REVISAO"))
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.reason").doesNotExist());
        adminAction(admin, "/api/admin/moderation/content/" + v1 + "/approve", null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Este envio foi substituído por um envio mais novo da mesma startup"));
        publishedPitch(investor, startup).andExpect(status().isNotFound());

        adminAction(admin, "/api/admin/moderation/content/" + v2 + "/approve", null).andExpect(status().isOk());
        novaRequisicao();
        publishedPitch(investor, startup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.shortPitch").value("Segunda versão"))
                .andExpect(jsonPath("$.leanCanvas.problem").value("Problema novo"));

        // Histórico: os dois envios, o antigo com current=false
        MvcResult history = mockMvc.perform(get("/api/admin/moderation/content").param("status", "PUBLICADO,REMOVIDO")
                        .param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andReturn();
        List<Map<String, Object>> mine = JsonPath.read(history.getResponse().getContentAsString(),
                "$.items[?(@.startupId == " + startup.getId() + ")]");
        assertThat(mine).extracting(item -> item.get("status"), item -> item.get("current"))
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("PUBLICADO", true),
                        org.assertj.core.groups.Tuple.tuple("REMOVIDO", false));
    }

    @Test
    void novoEnvioEmRevisaoTiraOAnteriorDoPublico() throws Exception {
        savePitch(startup, "Versão aprovada", null, "Problema");
        long v1 = submitAndGetId(startup);
        adminAction(admin, "/api/admin/moderation/content/" + v1 + "/approve", null).andExpect(status().isOk());
        savePitch(startup, "Versão nova", null, "Problema");
        submitAndGetId(startup);
        // Nunca devolve EM_REVISAO ao público, e o envio novo substitui o anterior
        publishedPitch(investor, startup).andExpect(status().isNotFound());
        MvcResult queue = mockMvc.perform(get("/api/admin/moderation/content").param("limit", "100")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andReturn();
        // Sem filtro, a fila (EM_REVISAO atual) vem antes do histórico
        List<String> statuses = JsonPath.read(queue.getResponse().getContentAsString(), "$.items[*].status");
        assertThat(statuses.get(0)).isEqualTo("EM_REVISAO");
    }

    // ------------------------------------------------------------
    // Validação e permissões do envio
    // ------------------------------------------------------------

    @Test
    void envioValidaPitchVazioTamanhoEVideo() throws Exception {
        submitPitch(startup)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Escreva o pitch curto antes de enviar para publicação"));

        // 19900 no pitch curto mais os blocos do canvas passam de 20000 caracteres, e o JSON
        // ainda cabe nos 20 KB que o onboarding aceita
        savePitch(startup, "a".repeat(19_900), null, "Problema");
        submitPitch(startup)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "O pitch e o Lean Canvas passam do limite de 20000 caracteres. Encurte o texto e envie de novo"));

        savePitch(startup, "Pitch válido", "https://exemplo.com/video", "Problema");
        submitPitch(startup)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("O link do vídeo precisa ser do YouTube ou do Vimeo"));

        assertThat(publicationRepository.findMaxVersion(startup.getId())).isZero();
    }

    @Test
    void soStartupComPerfilEnviaEInvestidorNaoEnvia() throws Exception {
        User semPerfil = createUser(Role.STARTUP);
        submitPitch(semPerfil)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Crie seu perfil de startup antes de publicar o pitch"));
        submitPitch(investor).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/profile/startup/pitch/publication").header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isForbidden());
        publishedPitch(investor, investor)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Startup não encontrada"));
    }

    @Test
    void removerExigeMotivoEEnvioInexistenteDa404() throws Exception {
        savePitch(startup, "Pitch", null, "Problema");
        long id = submitAndGetId(startup);
        adminAction(admin, "/api/admin/moderation/content/" + id + "/remove", "no")
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/admin/moderation/content/" + id + "/remove")
                        .header(HttpHeaders.AUTHORIZATION, bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
        adminAction(admin, "/api/admin/moderation/content/999999999/approve", null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Envio de pitch não encontrado"));
    }

    // ------------------------------------------------------------
    // Moderação da conta, auditoria e LGPD
    // ------------------------------------------------------------

    @Test
    void pitchDeContaSuspensaSomeEVoltaAoReativar() throws Exception {
        savePitch(startup, "Pitch publicado", null, "Problema");
        long id = submitAndGetId(startup);
        adminAction(admin, "/api/admin/moderation/content/" + id + "/approve", null).andExpect(status().isOk());
        adminAction(admin, "/api/admin/moderation/accounts/" + startup.getId() + "/suspend", "Investigação")
                .andExpect(status().isOk());
        novaRequisicao();
        publishedPitch(investor, startup)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Startup não encontrada"));
        adminAction(admin, "/api/admin/moderation/accounts/" + startup.getId() + "/reactivate", null)
                .andExpect(status().isOk());
        novaRequisicao();
        publishedPitch(investor, startup).andExpect(status().isOk());
    }

    @Test
    void aprovarERemoverPitchVaoParaAAuditoria() throws Exception {
        savePitch(startup, "Pitch auditado", null, "Problema");
        long id = submitAndGetId(startup);
        adminAction(admin, "/api/admin/moderation/content/" + id + "/approve", null).andExpect(status().isOk());
        adminAction(admin, "/api/admin/moderation/content/" + id + "/remove", "Conteúdo enganoso")
                .andExpect(status().isOk());
        novaRequisicao();
        MvcResult audit = mockMvc.perform(get("/api/admin/audit").header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isOk())
                .andReturn();
        List<Map<String, Object>> rows = JsonPath.read(audit.getResponse().getContentAsString(),
                "$[?(@.entityType == 'StartupPitchPublication' && @.entityId == '" + id + "')]");
        assertThat(rows).extracting(row -> row.get("action"))
                .containsExactlyInAnyOrder("MODERACAO_PITCH_APROVADO", "MODERACAO_PITCH_REMOVIDO");
        assertThat(rows).allMatch(row -> admin.getEmail().equals(row.get("actorEmail")));
        assertThat(rows).anyMatch(row -> ((String) row.get("details")).contains("Motivo: Conteúdo enganoso"));
    }

    @Test
    void exclusaoDaContaApagaOsEnviosDoPitch() throws Exception {
        savePitch(startup, "Pitch para apagar", null, "Problema");
        submitAndGetId(startup);
        assertThat(publicationRepository.findMaxVersion(startup.getId())).isEqualTo(1);
        mockMvc.perform(post("/api/privacy/delete-account").header(HttpHeaders.AUTHORIZATION, bearer(startup))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\": \"%s\", \"confirmed\": true}".formatted(DEFAULT_PASSWORD)))
                .andExpect(status().is2xxSuccessful());
        novaRequisicao();
        assertThat(publicationRepository.findFirstByUserIdOrderByVersionDesc(startup.getId())).isEmpty();
    }

    @Test
    void rotasAntigasDePerfilEDescobertaNaoMudam() throws Exception {
        savePitch(startup, "Pitch publicado", null, "Problema");
        long id = submitAndGetId(startup);
        adminAction(admin, "/api/admin/moderation/content/" + id + "/approve", null).andExpect(status().isOk());
        novaRequisicao();
        // GET /api/discovery/startups/{id}: o perfil público continua sem pitch publicado nem canvas novo
        MvcResult detail = mockMvc.perform(get("/api/discovery/startups/{id}", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isOk())
                .andReturn();
        Map<String, Object> profile = JsonPath.read(detail.getResponse().getContentAsString(), "$.profile");
        assertThat(profile).doesNotContainKeys("shortPitch", "leanCanvas", "videoUrl");
        // GET /api/profile/startup/{id}: mesmo contrato do T22
        MvcResult publicProfile = mockMvc.perform(get("/api/profile/startup/{id}", startup.getId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(investor)))
                .andExpect(status().isOk())
                .andReturn();
        Map<String, Object> body = JsonPath.read(publicProfile.getResponse().getContentAsString(), "$");
        assertThat(body).doesNotContainKeys("shortPitch", "leanCanvas", "videoUrl", "status");
    }
}

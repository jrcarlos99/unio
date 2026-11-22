package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.moderation.repository.AccountModerationRepository;
import br.com.unio.matchmaking_backend.moderation.repository.StartupPitchPublicationRepository;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import com.jayway.jsonpath.JsonPath;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * D064 (RNF03): a exportação de dados traz a moderação da conta e os envios do pitch do
 * próprio titular, coerente com a exclusão, sem mudar as chaves que já existiam.
 */
class ExportacaoModeracaoIntegrationTest extends ModeracaoTestSupport {

    /** Chaves do export antes da D064, na ordem, com o tipo de cada uma. */
    private static final List<Map.Entry<String, Class<?>>> CHAVES_ANTIGAS = List.of(
            Map.entry("exportedAt", String.class),
            Map.entry("account", Map.class),
            Map.entry("consent", Map.class),
            Map.entry("profile", Map.class),
            Map.entry("onboarding", Map.class),
            Map.entry("conversations", List.class),
            Map.entry("meetings", List.class),
            Map.entry("reviewsWritten", List.class),
            Map.entry("reviewsReceived", List.class),
            Map.entry("profileViewsMade", List.class),
            Map.entry("profileViewsReceivedTotal", Number.class),
            Map.entry("interestsSent", List.class),
            Map.entry("interestsReceivedTotal", Number.class),
            Map.entry("saved", List.class),
            Map.entry("auditLog", List.class));

    @Autowired
    private StartupPitchPublicationRepository publicationRepository;

    @Autowired
    private AccountModerationRepository moderationRepository;

    private User admin;

    @BeforeEach
    void setUp() {
        admin = createUser(Role.ADMIN);
    }

    private Map<String, Object> export(User user) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/privacy/export").header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$");
    }

    private String exportText(User user) throws Exception {
        return mockMvc.perform(get("/api/privacy/export").header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private long submit(User startup) throws Exception {
        MvcResult result = submitPitch(startup).andExpect(status().isOk()).andReturn();
        novaRequisicao();
        return idFrom(result);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> publications(Map<String, Object> export) {
        return (List<Map<String, Object>>) export.get("pitchPublications");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> canvas(Map<String, Object> envio) {
        return (Map<String, Object>) envio.get("leanCanvas");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> moderation(Map<String, Object> export) {
        return (Map<String, Object>) export.get("moderation");
    }

    @Test
    void startupComDoisEnviosExportaOsDoisDoMaisRecenteParaOMaisAntigo() throws Exception {
        User startup = createStartupWithProfile();
        savePitch(startup, "Primeira versão", null, "Problema antigo");
        long v1 = submit(startup);
        adminAction(admin, "/api/admin/moderation/content/" + v1 + "/remove", "Contém telefone pessoal")
                .andExpect(status().isOk());
        savePitch(startup, "Segunda versão", "https://youtu.be/dQw4w9WgXcQ", "Problema novo");
        long v2 = submit(startup);

        Map<String, Object> export = export(startup);
        List<Map<String, Object>> envios = publications(export);
        assertThat(envios).hasSize(2);

        Map<String, Object> novo = envios.get(0);
        assertThat(((Number) novo.get("id")).longValue()).isEqualTo(v2);
        assertThat(novo.get("version")).isEqualTo(2);
        assertThat(novo.get("status")).isEqualTo("EM_REVISAO");
        assertThat(novo.get("removalReason")).isNull();
        assertThat(novo.get("submittedAt")).isNotNull();
        assertThat(novo.get("shortPitch")).isEqualTo("Segunda versão");
        assertThat(novo.get("videoUrl")).isEqualTo("https://youtu.be/dQw4w9WgXcQ");
        assertThat(canvas(novo)).containsEntry("problem", "Problema novo").hasSize(9);

        Map<String, Object> antigo = envios.get(1);
        assertThat(((Number) antigo.get("id")).longValue()).isEqualTo(v1);
        assertThat(antigo.get("version")).isEqualTo(1);
        assertThat(antigo.get("status")).isEqualTo("REMOVIDO");
        assertThat(antigo.get("removalReason")).isEqualTo("Contém telefone pessoal");
        assertThat(antigo.get("reviewedAt")).isNotNull();
        assertThat(antigo.get("shortPitch")).isEqualTo("Primeira versão");
        assertThat(canvas(antigo)).containsEntry("problem", "Problema antigo");

        // Sem nada do administrador que decidiu
        assertThat(antigo).doesNotContainKeys("reviewedBy", "reviewedByUserId");
        assertThat(exportText(startup)).doesNotContain(admin.getEmail());
    }

    @Test
    void investidorExportaListaVaziaEModeracaoAprovadaSemRegistro() throws Exception {
        User investor = createInvestorWithProfile();
        Map<String, Object> export = export(investor);
        assertThat(publications(export)).isEmpty();
        assertThat(moderation(export))
                .containsEntry("status", "APROVADO")
                .containsEntry("hasRecord", false)
                .containsEntry("reason", null)
                .containsEntry("reviewedAt", null);
    }

    @Test
    void contaSuspensaOuRecusadaExportaASituacaoEOMotivo() throws Exception {
        User suspensa = createStartupWithProfile();
        User recusada = createInvestorWithProfile();
        adminAction(admin, "/api/admin/moderation/accounts/" + suspensa.getId() + "/suspend", "Investigação de fraude")
                .andExpect(status().isOk());
        adminAction(admin, "/api/admin/moderation/accounts/" + recusada.getId() + "/reject", "Cadastro duplicado")
                .andExpect(status().isOk());
        novaRequisicao();

        // O token emitido antes continua valendo até expirar (D063): o titular ainda exporta
        Map<String, Object> exportSuspensa = moderation(export(suspensa));
        assertThat(exportSuspensa)
                .containsEntry("status", "SUSPENSO")
                .containsEntry("hasRecord", true)
                .containsEntry("reason", "Investigação de fraude")
                .containsOnlyKeys("status", "hasRecord", "reason", "reviewedAt");
        assertThat(exportSuspensa.get("reviewedAt")).isNotNull();
        assertThat(moderation(export(recusada)))
                .containsEntry("status", "RECUSADO")
                .containsEntry("reason", "Cadastro duplicado");
        assertThat(exportText(suspensa)).doesNotContain(admin.getEmail());
    }

    @Test
    void chavesAntigasContinuamNaMesmaOrdemComOMesmoTipoEAsNovasVemNoFim() throws Exception {
        // Cadastro pela API, para ter o registro de consentimento como um usuário real
        String email = "export-contrato-" + System.nanoTime() + "@teste.unio";
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "%s", "password": "%s", "role": "STARTUP",
                                 "documento": "%s", "acceptedTerms": true}
                                """.formatted(email, DEFAULT_PASSWORD, String.valueOf(System.nanoTime()).substring(0, 11))))
                .andExpect(status().isCreated());
        novaRequisicao();
        User startup = userRepository.findByEmail(email).orElseThrow();
        startupRepository.save(Startup.builder()
                .user(startup).nome("Contrato Export").segmento("Logística").estagio("Seed")
                .localizacao("Recife, PE").modeloNegocio("B2B").mercadoAlvo("Transportadoras")
                .capitalProcurado(new BigDecimal("300000")).build());
        novaRequisicao();

        Map<String, Object> export = export(startup);
        List<String> esperadas = new ArrayList<>(CHAVES_ANTIGAS.stream().map(Map.Entry::getKey).toList());
        esperadas.add("moderation");
        esperadas.add("pitchPublications");
        assertThat(new ArrayList<>(export.keySet())).containsExactlyElementsOf(esperadas);
        for (Map.Entry<String, Class<?>> chave : CHAVES_ANTIGAS) {
            assertThat(export.get(chave.getKey()))
                    .as("chave %s", chave.getKey())
                    .isInstanceOf(chave.getValue());
        }
        assertThat(export.get("moderation")).isInstanceOf(Map.class);
        assertThat(export.get("pitchPublications")).isInstanceOf(List.class);
    }

    @Test
    void depoisDaExclusaoNaoSobraNadaDasDuasTabelas() throws Exception {
        User startup = createStartupWithProfile();
        savePitch(startup, "Pitch para apagar", null, "Problema");
        submit(startup);
        adminAction(admin, "/api/admin/moderation/accounts/" + startup.getId() + "/suspend", "Antes de excluir")
                .andExpect(status().isOk());
        novaRequisicao();
        assertThat(publicationRepository.findByUserIdOrderByVersionDesc(startup.getId())).hasSize(1);
        assertThat(moderationRepository.findById(startup.getId())).isPresent();

        mockMvc.perform(post("/api/privacy/delete-account").header(HttpHeaders.AUTHORIZATION, bearer(startup))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\": \"%s\", \"confirmed\": true}".formatted(DEFAULT_PASSWORD)))
                .andExpect(status().is2xxSuccessful());
        novaRequisicao();

        assertThat(publicationRepository.findByUserIdOrderByVersionDesc(startup.getId())).isEmpty();
        assertThat(moderationRepository.findById(startup.getId())).isEmpty();
    }

    @Test
    void exportDeUmUsuarioNuncaTrazEnviosDeOutro() throws Exception {
        User a = createStartupWithProfile();
        User b = createStartupWithProfile();
        savePitch(a, "Pitch da startup A", null, "Problema A");
        long envioA = submit(a);
        savePitch(b, "Pitch da startup B", null, "Problema B");
        long envioB = submit(b);
        adminAction(admin, "/api/admin/moderation/accounts/" + b.getId() + "/suspend", "Só a B")
                .andExpect(status().isOk());
        novaRequisicao();

        Map<String, Object> exportA = export(a);
        assertThat(publications(exportA)).extracting(item -> ((Number) item.get("id")).longValue())
                .containsExactly(envioA);
        assertThat(moderation(exportA)).containsEntry("status", "APROVADO").containsEntry("hasRecord", false);
        assertThat(exportText(a)).doesNotContain("Pitch da startup B").doesNotContain("Só a B");

        Map<String, Object> exportB = export(b);
        assertThat(publications(exportB)).extracting(item -> ((Number) item.get("id")).longValue())
                .containsExactly(envioB);

        // O ADMIN não ganha nada a mais: exporta só os próprios dados
        Map<String, Object> exportAdmin = export(admin);
        assertThat(publications(exportAdmin)).isEmpty();
        assertThat(moderation(exportAdmin)).containsEntry("hasRecord", false);
    }
}

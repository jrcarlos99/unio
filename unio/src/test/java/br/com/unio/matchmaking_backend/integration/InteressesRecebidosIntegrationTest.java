package br.com.unio.matchmaking_backend.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.ResultActions;

/** D065: GET /api/interests/received e /api/interests/received/count. */
class InteressesRecebidosIntegrationTest extends ModeracaoTestSupport {

    private static final String RECEBIDOS = "/api/interests/received";
    private static final String CONTAGEM = "/api/interests/received/count";

    private User startup;
    private User investidor;

    @BeforeEach
    void setUp() {
        startup = createStartupWithProfile();
        investidor = createInvestorWithProfile();
    }

    private void interesse(User de, User para) throws Exception {
        mockMvc.perform(put("/api/interests/{id}", para.getId()).header(HttpHeaders.AUTHORIZATION, bearer(de)))
                .andExpect(status().isOk());
    }

    private ResultActions recebidos(User user) throws Exception {
        return mockMvc.perform(get(RECEBIDOS).header(HttpHeaders.AUTHORIZATION, bearer(user)));
    }

    private ResultActions contagem(User user) throws Exception {
        return mockMvc.perform(get(CONTAGEM).header(HttpHeaders.AUTHORIZATION, bearer(user)));
    }

    /** Dentro da transação do teste o now() do banco é sempre o mesmo; acerta a data à mão. */
    private void dataDoInteresse(User de, User para, Instant quando) {
        entityManager.flush();
        entityManager.createNativeQuery("""
                        update match_interests set created_at = :quando
                        where liked_by_user_id = :de and (startup_id = :para or investor_id = :para)
                        """)
                .setParameter("quando", java.sql.Timestamp.from(quando))
                .setParameter("de", de.getId())
                .setParameter("para", para.getId())
                .executeUpdate();
        novaRequisicao();
    }

    @Test
    void listaSoOsInteressesRecebidosAindaNaoCorrespondidos() throws Exception {
        User outroInvestidor = createInvestorWithProfile();
        User investidorQueEuCurti = createInvestorWithProfile();
        interesse(investidor, startup);
        interesse(outroInvestidor, startup);
        interesse(startup, outroInvestidor); // virou match: sai da lista
        interesse(startup, investidorQueEuCurti); // enviado por mim: não é recebido

        recebidos(startup)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.limit").value(20))
                .andExpect(jsonPath("$.offset").value(0))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].userId").value(investidor.getId()))
                .andExpect(jsonPath("$.items[0].role").value("INVESTOR"))
                .andExpect(jsonPath("$.items[0].name").isNotEmpty())
                .andExpect(jsonPath("$.items[0].segmento").value("Logística"))
                .andExpect(jsonPath("$.items[0].estagio").value("Seed"))
                .andExpect(jsonPath("$.items[0].localizacao").value("Nordeste"))
                .andExpect(jsonPath("$.items[0].interestedAt").isNotEmpty());

        // Do lado do investidor, a startup aparece com os campos públicos dela
        interesse(startup, createInvestorWithProfile());
        User outraStartup = createStartupWithProfile();
        interesse(outraStartup, investidor);
        recebidos(investidor)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].userId").value(outraStartup.getId()))
                .andExpect(jsonPath("$.items[0].role").value("STARTUP"))
                .andExpect(jsonPath("$.items[0].localizacao").value("Recife, PE"));
    }

    @Test
    void someDepoisDeRetribuirEViraMatch() throws Exception {
        interesse(investidor, startup);
        contagem(startup).andExpect(jsonPath("$.total").value(1));

        mockMvc.perform(put("/api/interests/{id}", investidor.getId()).header(HttpHeaders.AUTHORIZATION,
                        bearer(startup)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MATCH"));

        recebidos(startup).andExpect(jsonPath("$.total").value(0)).andExpect(jsonPath("$.items", hasSize(0)));
        contagem(startup).andExpect(jsonPath("$.total").value(0));
        recebidos(investidor).andExpect(jsonPath("$.total").value(0));
        mockMvc.perform(get("/api/interests/matches").header(HttpHeaders.AUTHORIZATION, bearer(startup)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.userId == %d)].contact.email".formatted(investidor.getId()))
                        .value(investidor.getEmail()));
    }

    @Test
    void someQuandoOOutroLadoDesfazOInteresse() throws Exception {
        interesse(investidor, startup);
        recebidos(startup).andExpect(jsonPath("$.total").value(1));

        mockMvc.perform(delete("/api/interests/{id}", startup.getId()).header(HttpHeaders.AUTHORIZATION,
                        bearer(investidor)))
                .andExpect(status().isOk());

        recebidos(startup).andExpect(jsonPath("$.total").value(0));
        contagem(startup).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void naoMostraContaSuspensaNemRecusada() throws Exception {
        User admin = createUser(Role.ADMIN);
        User recusado = createInvestorWithProfile();
        interesse(investidor, startup);
        interesse(recusado, startup);
        contagem(startup).andExpect(jsonPath("$.total").value(2));

        adminAction(admin, "/api/admin/moderation/accounts/" + investidor.getId() + "/suspend", "Spam")
                .andExpect(status().isOk());
        adminAction(admin, "/api/admin/moderation/accounts/" + recusado.getId() + "/reject", "Cadastro falso")
                .andExpect(status().isOk());
        novaRequisicao();

        recebidos(startup).andExpect(jsonPath("$.total").value(0)).andExpect(jsonPath("$.items", hasSize(0)));
        contagem(startup).andExpect(jsonPath("$.total").value(0));

        // Reativada, volta a aparecer
        adminAction(admin, "/api/admin/moderation/accounts/" + investidor.getId() + "/reactivate", null)
                .andExpect(status().isOk());
        novaRequisicao();
        recebidos(startup).andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void naoVazaEmailDocumentoNemArquivoDePitch() throws Exception {
        interesse(startup, investidor);
        interesse(investidor, createStartupWithProfile());
        User startupInteressada = createStartupWithProfile();
        interesse(startupInteressada, investidor);

        String json = recebidos(investidor).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(json)
                .doesNotContain(startupInteressada.getEmail())
                .doesNotContain("@teste.unio")
                .doesNotContain("email")
                .doesNotContain("contact")
                .doesNotContain("pitchFileUrl")
                .doesNotContain("cnpj")
                .doesNotContain("cpf")
                .doesNotContain("documento")
                .doesNotContain("passwordHash");
    }

    @Test
    void adminRecebe403SemTokenRecebe401ESemPerfilVemVazio() throws Exception {
        User admin = createUser(Role.ADMIN);
        recebidos(admin).andExpect(status().isForbidden());
        contagem(admin).andExpect(status().isForbidden());

        mockMvc.perform(get(RECEBIDOS)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(CONTAGEM)).andExpect(status().isUnauthorized());

        // Mesmo padrão de /api/interests/matches e /api/saved: sem perfil, lista vazia (ninguém
        // consegue demonstrar interesse em quem não tem perfil)
        User semPerfil = createUser(Role.STARTUP);
        recebidos(semPerfil).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        contagem(semPerfil).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void cadaUsuarioVeSoOsProprios() throws Exception {
        User outraStartup = createStartupWithProfile();
        interesse(investidor, startup);

        recebidos(outraStartup).andExpect(jsonPath("$.total").value(0));
        contagem(outraStartup).andExpect(jsonPath("$.total").value(0));
        // Quem enviou não vê o próprio interesse como recebido
        recebidos(investidor).andExpect(jsonPath("$.total").value(0));
        recebidos(startup).andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void paginaDoMaisRecenteParaOMaisAntigoEContagemCoerente() throws Exception {
        User antigo = createInvestorWithProfile();
        User medio = createInvestorWithProfile();
        User recente = createInvestorWithProfile();
        interesse(antigo, startup);
        interesse(medio, startup);
        interesse(recente, startup);
        Instant agora = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        dataDoInteresse(antigo, startup, agora.minus(3, ChronoUnit.DAYS));
        dataDoInteresse(medio, startup, agora.minus(2, ChronoUnit.DAYS));
        dataDoInteresse(recente, startup, agora.minus(1, ChronoUnit.DAYS));

        String primeira = mockMvc.perform(get(RECEBIDOS).param("limit", "2").param("offset", "0")
                        .header(HttpHeaders.AUTHORIZATION, bearer(startup)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.limit").value(2))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(primeira, "$.items[*].userId");
        assertThat(ids.stream().map(Number::longValue).toList()).containsExactly(recente.getId(), medio.getId());

        mockMvc.perform(get(RECEBIDOS).param("limit", "2").param("offset", "2")
                        .header(HttpHeaders.AUTHORIZATION, bearer(startup)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.offset").value(2))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].userId").value(antigo.getId()));

        // Limites fora da faixa: padrão 20, máximo 100, offset negativo vira 0
        mockMvc.perform(get(RECEBIDOS).param("limit", "500").param("offset", "-4")
                        .header(HttpHeaders.AUTHORIZATION, bearer(startup)))
                .andExpect(jsonPath("$.limit").value(100))
                .andExpect(jsonPath("$.offset").value(0))
                .andExpect(jsonPath("$.items", hasSize(3)));

        contagem(startup).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(3));
    }
}

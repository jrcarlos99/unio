package br.com.unio.matchmaking_backend.profile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.JwtService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integração da criação de perfil (filtro JWT + Bean Validation + JPA + migration V23).
 * Cada teste roda em transação revertida ao final.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProfileControllerTest {

    private static final String STARTUP_BASE =
            "\"nome\":\"EcoTech\",\"segmento\":\"Fintech\",\"estagio\":\"MVP\","
                    + "\"localizacao\":\"Recife / Porto Digital\",\"modeloNegocio\":\"B2B\",\"mercadoAlvo\":\"PMEs\"";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void startupSemCapitalProcuradoECriada() throws Exception {
        postStartup("{" + STARTUP_BASE + "}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("EcoTech"))
                .andExpect(jsonPath("$.capitalProcurado").doesNotExist());
    }

    @Test
    void startupComCapitalZeroContinua400() throws Exception {
        postStartup("{" + STARTUP_BASE + ",\"capitalProcurado\":0}").andExpect(status().isBadRequest());
    }

    @Test
    void startupComCapitalNegativoContinua400() throws Exception {
        postStartup("{" + STARTUP_BASE + ",\"capitalProcurado\":-10}").andExpect(status().isBadRequest());
    }

    @Test
    void startupSemNomeContinua400() throws Exception {
        postStartup("""
                {"segmento":"Fintech","estagio":"MVP","localizacao":"Recife","modeloNegocio":"B2B","mercadoAlvo":"PMEs"}
                """).andExpect(status().isBadRequest());
    }

    @Test
    void investidorSemTicketsEPerfilRiscoECriadoComPadrao() throws Exception {
        postInvestor("""
                {"segmentosInteresse":["Fintech","EdTech","AgTech"],"estagiosInteresse":["MVP"],
                 "regiaoInteresse":"Nordeste","disponibilidade":"MEDIA"}
                """)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticketMinimo").doesNotExist())
                .andExpect(jsonPath("$.ticketMaximo").doesNotExist())
                .andExpect(jsonPath("$.perfilRisco").value("Investidor Anjo"))
                .andExpect(jsonPath("$.disponibilidade").value("MEDIA"));
    }

    @Test
    void investidorComTicketMinimoMaiorQueMaximoContinua400() throws Exception {
        postInvestor("{\"ticketMinimo\":500000,\"ticketMaximo\":50000}").andExpect(status().isBadRequest());
    }

    @Test
    void investidorComTicketNegativoContinua400() throws Exception {
        postInvestor("{\"ticketMinimo\":-1}").andExpect(status().isBadRequest());
    }

    private ResultActions postStartup(String body) throws Exception {
        return mockMvc.perform(post("/api/profile/startup")
                .header(HttpHeaders.AUTHORIZATION, tokenFor(Role.STARTUP))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions postInvestor(String body) throws Exception {
        return mockMvc.perform(post("/api/profile/investor")
                .header(HttpHeaders.AUTHORIZATION, tokenFor(Role.INVESTOR))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private String tokenFor(Role role) {
        User user = userRepository.save(User.builder()
                .email("perfil-" + UUID.randomUUID() + "@teste.unio")
                .passwordHash("n/a")
                .role(role)
                .build());
        return "Bearer " + jwtService.generateToken(user);
    }
}

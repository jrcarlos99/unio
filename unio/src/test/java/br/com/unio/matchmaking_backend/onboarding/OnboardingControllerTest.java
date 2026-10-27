package br.com.unio.matchmaking_backend.onboarding;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.transaction.annotation.Transactional;

/**
 * Integração completa (filtro JWT + controller + JPA). Cada teste roda em transação
 * revertida ao final, então não deixa usuários nem onboardings no banco.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OnboardingControllerTest {

    private static final String URL = "/api/profile/onboarding";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void getSemRegistroDevolvePendente() throws Exception {
        String token = tokenFor(Role.STARTUP);

        mockMvc.perform(get(URL).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.respostas").isEmpty())
                .andExpect(jsonPath("$.atualizadoEm").doesNotExist());
    }

    @Test
    void putSalvaEGetSeguinteDevolveOMesmo() throws Exception {
        String token = tokenFor(Role.INVESTOR);
        String body = """
                {"status":"CONCLUIDO","respostas":{"segmentosInteresse":["Fintech","Saúde"],
                 "ticketMedio":"R$ 50 a 200 mil","apenasMentor":false,"consentimentoLgpd":true}}
                """;

        mockMvc.perform(put(URL).header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDO"))
                .andExpect(jsonPath("$.atualizadoEm").isString());

        mockMvc.perform(get(URL).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDO"))
                .andExpect(jsonPath("$.respostas.segmentosInteresse[1]").value("Saúde"))
                .andExpect(jsonPath("$.respostas.ticketMedio").value("R$ 50 a 200 mil"))
                .andExpect(jsonPath("$.respostas.apenasMentor").value(false))
                .andExpect(jsonPath("$.respostas.consentimentoLgpd").value(true));
    }

    @Test
    void putSoComRespostasNaoMudaStatus() throws Exception {
        String token = tokenFor(Role.STARTUP);

        mockMvc.perform(put(URL).header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PULADO\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put(URL).header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"respostas\":{\"segmento\":\"Fintech\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PULADO"))
                .andExpect(jsonPath("$.respostas.segmento").value("Fintech"));
    }

    @Test
    void statusInvalidoDevolve400() throws Exception {
        mockMvc.perform(put(URL).header(HttpHeaders.AUTHORIZATION, tokenFor(Role.STARTUP))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"FINALIZADO\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void respostasAcimaDe20KbDevolve400() throws Exception {
        String body = "{\"respostas\":{\"pitch\":\"" + "x".repeat(21 * 1024) + "\"}}";

        mockMvc.perform(put(URL).header(HttpHeaders.AUTHORIZATION, tokenFor(Role.STARTUP))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminRecebe403() throws Exception {
        String token = tokenFor(Role.ADMIN);

        mockMvc.perform(get(URL).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isForbidden());
        mockMvc.perform(put(URL).header(HttpHeaders.AUTHORIZATION, token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONCLUIDO\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void semTokenEhBarrado() throws Exception {
        // Bloco E: o SecurityConfig define HttpStatusEntryPoint(401) para requisições sem token
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mockMvc.perform(put(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void usuarioNaoEnxergaOnboardingDeOutro() throws Exception {
        String tokenA = tokenFor(Role.STARTUP);
        String tokenB = tokenFor(Role.STARTUP);

        mockMvc.perform(put(URL).header(HttpHeaders.AUTHORIZATION, tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONCLUIDO\",\"respostas\":{\"segmento\":\"Fintech\"}}"))
                .andExpect(status().isOk());

        mockMvc.perform(get(URL).header(HttpHeaders.AUTHORIZATION, tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.respostas").isEmpty());
    }

    private String tokenFor(Role role) {
        User user = userRepository.save(User.builder()
                .email("onboarding-" + UUID.randomUUID() + "@teste.unio")
                .passwordHash("n/a")
                .role(role)
                .build());
        return "Bearer " + jwtService.generateToken(user);
    }
}

package br.com.unio.matchmaking_backend.integration;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.JwtService;
import br.com.unio.matchmaking_backend.match.repository.MatchInterestRepository;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * Base dos testes de integração (Bloco E / RNF07): contexto completo, filtro JWT,
 * controllers, JPA e Flyway no PostgreSQL configurado no perfil ativo (dev por padrão,
 * como os demais testes do projeto). Cada teste roda numa transação revertida no final.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
abstract class IntegrationTestSupport {

    static final String DEFAULT_PASSWORD = "senhaForte123";

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected JwtService jwtService;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected MatchInterestRepository matchInterestRepository;

    protected User createUser(Role role) {
        return userRepository.save(User.builder()
                .email(role.name().toLowerCase() + "-" + UUID.randomUUID() + "@teste.unio")
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .role(role)
                .build());
    }

    /**
     * D051: reunião só com match mútuo; os testes de reunião criam o match no setup.
     * D058: grava as duas linhas em match_interests (a fonte única) e acerta o status.
     */
    protected void createMatch(User a, User b) {
        User startup = a.getRole() == Role.STARTUP ? a : b;
        User investor = a.getRole() == Role.STARTUP ? b : a;
        matchInterestRepository.insertIfAbsent(startup.getId(), investor.getId(), a.getId());
        matchInterestRepository.insertIfAbsent(startup.getId(), investor.getId(), b.getId());
        matchInterestRepository.syncPairStatus(a.getId(), b.getId());
    }

    protected String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    protected static long idFrom(MvcResult result) throws Exception {
        return longAt(result, "$.id");
    }

    protected static long longAt(MvcResult result, String path) throws Exception {
        Object value = JsonPath.read(result.getResponse().getContentAsString(), path);
        return ((Number) value).longValue();
    }
}

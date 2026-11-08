package br.com.unio.matchmaking_backend.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceTest {

    private static final String SECRET = "matchmaking-test-secret-key-very-long-1234567890";

    @Test
    void tokenGeradoComConfiguracaoPadraoExpiraEmUmaHora() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");

        JwtService jwtService = new JwtService(environment);
        ReflectionTestUtils.setField(jwtService, "secret", SECRET);
        ReflectionTestUtils.setField(jwtService, "expirationMinutes", 60L);
        jwtService.init();

        User user = User.builder().email("ana@exemplo.com").passwordHash("x").role(Role.STARTUP).build();

        String token = jwtService.generateToken(user);

        Claims claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .build()
                .parseSignedClaims(token)
                .getPayload();

        long seconds = (claims.getExpiration().getTime() - claims.getIssuedAt().getTime()) / 1000;
        assertThat(seconds).isEqualTo(3600L);
    }
}

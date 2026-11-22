package br.com.unio.matchmaking_backend.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.profile.config.AdminSeedRunner;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

/** D054: o primeiro administrador vem de propriedades (variáveis de ambiente). */
class AdminSeedRunnerTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void semPropriedadesNaoFazNada() {
        assertThat(new AdminSeedRunner(userRepository, passwordEncoder, "", "").seed()).isFalse();
        assertThat(new AdminSeedRunner(userRepository, passwordEncoder, "admin@teste.unio", null).seed()).isFalse();
        verify(userRepository, never()).save(any());
    }

    @Test
    void naoCriaSeJaExisteAdmin() {
        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(true);
        assertThat(new AdminSeedRunner(userRepository, passwordEncoder, "admin@teste.unio", "senhaForte123").seed())
                .isFalse();
        verify(userRepository, never()).save(any());
    }

    @Test
    void naoCriaComSenhaCurtaOuEmailJaUsado() {
        assertThat(new AdminSeedRunner(userRepository, passwordEncoder, "admin@teste.unio", "curta").seed()).isFalse();
        when(userRepository.existsByEmail("admin@teste.unio")).thenReturn(true);
        assertThat(new AdminSeedRunner(userRepository, passwordEncoder, "Admin@Teste.unio", "senhaForte123").seed())
                .isFalse();
        verify(userRepository, never()).save(any());
    }

    @Test
    void criaOPrimeiroAdminComSenhaCodificada() {
        assertThat(new AdminSeedRunner(userRepository, passwordEncoder, " Admin@Teste.unio ", "senhaForte123").seed())
                .isTrue();
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo(Role.ADMIN);
        assertThat(saved.getValue().getEmail()).isEqualTo("admin@teste.unio");
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("hash");
    }
}

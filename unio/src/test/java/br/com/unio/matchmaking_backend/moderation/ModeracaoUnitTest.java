package br.com.unio.matchmaking_backend.moderation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModeration;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModerationStatus;
import br.com.unio.matchmaking_backend.moderation.repository.AccountModerationRepository;
import br.com.unio.matchmaking_backend.moderation.service.AccountModerationGate;
import br.com.unio.matchmaking_backend.moderation.service.AccountVisibility;
import br.com.unio.matchmaking_backend.moderation.service.ModerationActions;
import br.com.unio.matchmaking_backend.moderation.service.ModerationSettings;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

/** D063: ganchos e regras pequenas da moderação, sem banco. */
class ModeracaoUnitTest {

    private static User user(long id, Role role) throws Exception {
        User user = User.builder().email("u" + id + "@teste.unio").role(role).passwordHash("x").build();
        Field field = User.class.getDeclaredField("id");
        field.setAccessible(true);
        field.set(user, id);
        return user;
    }

    // ------------------------------------------------------------
    // Gancho em ParticipantService.isActive
    // ------------------------------------------------------------

    @Test
    void semAVisibilidadeInjetadaIsActiveFicaComoAntes() throws Exception {
        ParticipantService service = new ParticipantService(mock(UserRepository.class), mock(StartupRepository.class));
        User ativo = user(1, Role.STARTUP);
        User excluido = user(2, Role.STARTUP);
        excluido.setDeletedAt(Instant.now());
        assertThat(service.isActive(ativo)).isTrue();
        assertThat(service.isActive(excluido)).isFalse();
        assertThat(service.isActive(null)).isFalse();
    }

    @Test
    void comAVisibilidadeContaOcultaDeixaDeEstarAtivaEAsDemaisSeguemIguais() throws Exception {
        AccountModerationRepository repository = mock(AccountModerationRepository.class);
        when(repository.findUserIdsByStatusIn(any())).thenReturn(List.of(5L));
        ParticipantService service = new ParticipantService(mock(UserRepository.class), mock(StartupRepository.class));
        service.setAccountVisibility(new AccountVisibility(repository));

        assertThat(service.isActive(user(5, Role.STARTUP))).isFalse();
        assertThat(service.isActive(user(6, Role.STARTUP))).isTrue();
        // A lista de ocultos fica em memória: uma consulta para vários candidatos
        service.isActive(user(7, Role.INVESTOR));
        verify(repository, times(1)).findUserIdsByStatusIn(any());
    }

    @Test
    void invalidarObrigaARelerAListaDeOcultos() {
        AccountModerationRepository repository = mock(AccountModerationRepository.class);
        when(repository.findUserIdsByStatusIn(any())).thenReturn(List.of(), List.of(9L));
        AccountVisibility visibility = new AccountVisibility(repository);
        assertThat(visibility.isHidden(9L)).isFalse();
        visibility.invalidate();
        assertThat(visibility.isHidden(9L)).isTrue();
    }

    // ------------------------------------------------------------
    // Gancho no login e no cadastro
    // ------------------------------------------------------------

    @Test
    void loginBloqueiaSoRecusadoESuspensoENuncaOAdmin() throws Exception {
        AccountModerationRepository repository = mock(AccountModerationRepository.class);
        AccountModerationGate gate = new AccountModerationGate(repository, new ModerationSettings(false, true),
                new AccountVisibility(repository));
        when(repository.findById(1L)).thenReturn(Optional.empty());
        when(repository.findById(2L)).thenReturn(Optional.of(row(2L, AccountModerationStatus.RECUSADO)));
        when(repository.findById(3L)).thenReturn(Optional.of(row(3L, AccountModerationStatus.SUSPENSO)));
        when(repository.findById(4L)).thenReturn(Optional.of(row(4L, AccountModerationStatus.PENDENTE)));

        gate.checkLogin(user(1, Role.STARTUP));
        gate.checkLogin(user(4, Role.INVESTOR));
        assertThatThrownBy(() -> gate.checkLogin(user(2, Role.STARTUP)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Conta recusada pela moderação");
        assertThatThrownBy(() -> gate.checkLogin(user(3, Role.INVESTOR)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Conta suspensa");
        gate.checkLogin(user(2, Role.ADMIN));
        verify(repository, never()).findById(99L);
    }

    @Test
    void cadastroSoGravaPendenteComAPropriedadeLigadaENuncaParaAdmin() throws Exception {
        AccountModerationRepository repository = mock(AccountModerationRepository.class);
        new AccountModerationGate(repository, new ModerationSettings(false, true), new AccountVisibility(repository))
                .onAccountCreated(user(1, Role.STARTUP));
        verify(repository, never()).save(any());

        AccountModerationGate ligado = new AccountModerationGate(repository, new ModerationSettings(true, true),
                new AccountVisibility(repository));
        ligado.onAccountCreated(user(2, Role.ADMIN));
        verify(repository, never()).save(any());
        ligado.onAccountCreated(user(3, Role.INVESTOR));
        verify(repository, times(1)).save(any());
    }

    // ------------------------------------------------------------
    // Motivo
    // ------------------------------------------------------------

    @Test
    void motivoTemDe3a255CaracteresSemContarEspacosNasPontas() {
        assertThat(ModerationActions.requireReason("  abc  ")).isEqualTo("abc");
        assertThat(ModerationActions.requireReason("x".repeat(255))).hasSize(255);
        assertThatThrownBy(() -> ModerationActions.requireReason(null)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> ModerationActions.requireReason("  ab ")).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> ModerationActions.requireReason("x".repeat(256)))
                .isInstanceOf(ResponseStatusException.class);
    }

    private static AccountModeration row(Long userId, AccountModerationStatus status) {
        return AccountModeration.builder().userId(userId).status(status).build();
    }
}

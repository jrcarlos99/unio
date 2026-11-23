package br.com.unio.matchmaking_backend.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.onboarding.dto.OnboardingUpdateRequest;
import br.com.unio.matchmaking_backend.onboarding.entity.OnboardingStatus;
import br.com.unio.matchmaking_backend.onboarding.entity.UserOnboarding;
import br.com.unio.matchmaking_backend.onboarding.repository.UserOnboardingRepository;
import br.com.unio.matchmaking_backend.onboarding.service.OnboardingService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

class OnboardingServiceTest {

    private UserOnboardingRepository onboardingRepository;
    private UserRepository userRepository;
    private OnboardingService service;

    @BeforeEach
    void setUp() {
        onboardingRepository = mock(UserOnboardingRepository.class);
        userRepository = mock(UserRepository.class);
        service = new OnboardingService(onboardingRepository, userRepository,
                JsonMapper.builder().build());
        when(onboardingRepository.save(any(UserOnboarding.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void getSemRegistroDevolvePendenteSemCriarNada() {
        when(onboardingRepository.findById(1L)).thenReturn(Optional.empty());

        Map<String, Object> response = service.get(authUser(1L, Role.STARTUP));

        assertThat(response).containsEntry("status", "PENDENTE")
                .containsEntry("respostas", Map.of())
                .containsEntry("atualizadoEm", null);
        verify(onboardingRepository, never()).save(any());
    }

    @Test
    void updateCriaRegistroComStatusERespostas() {
        when(onboardingRepository.findById(1L)).thenReturn(Optional.empty());
        when(userRepository.getReferenceById(1L)).thenReturn(new User());

        Map<String, Object> response = service.update(authUser(1L, Role.INVESTOR),
                new OnboardingUpdateRequest(OnboardingStatus.CONCLUIDO,
                        Map.of("segmentosInteresse", List.of("Fintech"), "apenasMentor", false)));

        assertThat(response.get("status")).isEqualTo("CONCLUIDO");
        assertThat(response.get("respostas")).isEqualTo(
                Map.of("segmentosInteresse", List.of("Fintech"), "apenasMentor", false));
        assertThat(response.get("atualizadoEm")).isInstanceOf(Instant.class);
    }

    @Test
    void updateSoComRespostasMantemStatus() {
        UserOnboarding existente = UserOnboarding.builder()
                .id(1L)
                .status(OnboardingStatus.PULADO)
                .respostas("{\"segmento\":\"Saúde\"}")
                .atualizadoEm(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
        when(onboardingRepository.findById(1L)).thenReturn(Optional.of(existente));

        Map<String, Object> response = service.update(authUser(1L, Role.STARTUP),
                new OnboardingUpdateRequest(null, Map.of("segmento", "Fintech")));

        assertThat(response.get("status")).isEqualTo("PULADO");
        assertThat(response.get("respostas")).isEqualTo(Map.of("segmento", "Fintech"));
        assertThat(existente.getAtualizadoEm()).isAfter(Instant.parse("2026-01-01T00:00:00Z"));
    }

    @Test
    void updateSoComStatusMantemRespostas() {
        UserOnboarding existente = UserOnboarding.builder()
                .id(1L)
                .status(OnboardingStatus.PENDENTE)
                .respostas("{\"segmento\":\"Saúde\"}")
                .atualizadoEm(Instant.now())
                .build();
        when(onboardingRepository.findById(1L)).thenReturn(Optional.of(existente));

        Map<String, Object> response = service.update(authUser(1L, Role.STARTUP),
                new OnboardingUpdateRequest(OnboardingStatus.CONCLUIDO, null));

        assertThat(response.get("status")).isEqualTo("CONCLUIDO");
        assertThat(response.get("respostas")).isEqualTo(Map.of("segmento", "Saúde"));
    }

    @Test
    void updateRejeitaRespostasAcimaDe20Kb() {
        when(onboardingRepository.findById(1L)).thenReturn(Optional.empty());
        when(userRepository.getReferenceById(1L)).thenReturn(new User());

        assertThatThrownBy(() -> service.update(authUser(1L, Role.STARTUP),
                new OnboardingUpdateRequest(null, Map.of("pitch", "x".repeat(21 * 1024)))))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(onboardingRepository, never()).save(any());
    }

    @Test
    void adminRecebe403() {
        assertThatThrownBy(() -> service.get(authUser(9L, Role.ADMIN)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> service.update(authUser(9L, Role.ADMIN), new OnboardingUpdateRequest()))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    private AuthUser authUser(Long id, Role role) {
        AuthUser authUser = mock(AuthUser.class);
        when(authUser.getId()).thenReturn(id);
        when(authUser.getRole()).thenReturn(role);
        return authUser;
    }
}

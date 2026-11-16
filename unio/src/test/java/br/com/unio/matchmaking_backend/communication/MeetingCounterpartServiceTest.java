package br.com.unio.matchmaking_backend.communication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCounterpartResponse;
import br.com.unio.matchmaking_backend.communication.service.MeetingCounterpartService;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class MeetingCounterpartServiceTest {

    private UserRepository userRepository;
    private StartupRepository startupRepository;
    private InvestorRepository investorRepository;
    private MatchScoreRepository matchScoreRepository;
    private MeetingCounterpartService service;

    private User investor;
    private User tidalog;
    private User agro;
    private User removed;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        startupRepository = mock(StartupRepository.class);
        investorRepository = mock(InvestorRepository.class);
        matchScoreRepository = mock(MatchScoreRepository.class);
        ParticipantService participantService = new ParticipantService(userRepository, startupRepository);
        service = new MeetingCounterpartService(participantService, userRepository, startupRepository,
                investorRepository, matchScoreRepository);

        investor = user(2L, Role.INVESTOR, "rafael@fundo.com");
        tidalog = user(10L, Role.STARTUP, "contato@tidalog.com");
        agro = user(11L, Role.STARTUP, "time@agro.com");
        removed = user(12L, Role.STARTUP, "removido-12@unio.invalid");
        removed.setDeletedAt(Instant.parse("2026-11-01T00:00:00Z"));

        when(userRepository.findById(2L)).thenReturn(Optional.of(investor));
        when(userRepository.findById(10L)).thenReturn(Optional.of(tidalog));
    }

    @Test
    void investidorVeStartupsAtivasComScoreEOrdenadas() {
        Startup tidalogProfile = startup(tidalog, "Tidalog", "Logística", "Seed");
        Startup agroProfile = startup(agro, "AgroTech PE", "Agro", "Pré-seed");
        Startup removedProfile = startup(removed, "Antiga", "Fintech", "Seed");
        when(startupRepository.findAll()).thenReturn(List.of(agroProfile, tidalogProfile, removedProfile));
        when(startupRepository.findById(10L)).thenReturn(Optional.of(tidalogProfile));
        when(startupRepository.findById(11L)).thenReturn(Optional.of(agroProfile));
        when(userRepository.findAllById(anyIterable())).thenReturn(List.of(tidalog, agro, removed));
        when(matchScoreRepository.findByInvestorId(new UUID(0L, 2L))).thenReturn(List.of(
                score(2L, 10L, "70.00", "2026-11-01T10:00:00Z"),
                score(2L, 10L, "87.50", "2026-11-05T10:00:00Z")));

        List<MeetingCounterpartResponse> result = service.list(new AuthUser(investor));

        assertThat(result).extracting(MeetingCounterpartResponse::userId).containsExactly(10L, 11L);
        MeetingCounterpartResponse first = result.get(0);
        assertThat(first.name()).isEqualTo("Tidalog");
        assertThat(first.role()).isEqualTo("STARTUP");
        assertThat(first.subtitle()).isEqualTo("Logística • Seed");
        assertThat(first.segment()).isEqualTo("Logística");
        assertThat(first.stage()).isEqualTo("Seed");
        assertThat(first.matchScore()).isEqualByComparingTo("87.50");
        assertThat(result.get(1).matchScore()).isNull();
    }

    @Test
    void startupVeInvestidoresComTipoETicket() {
        Investor rafael = Investor.builder().id(2L).user(investor).perfilRisco("Investidor Anjo")
                .ticketMinimo(new BigDecimal("50000")).ticketMaximo(new BigDecimal("200000")).build();
        when(investorRepository.findAll()).thenReturn(List.of(rafael));
        when(userRepository.findAllById(anyIterable())).thenReturn(List.of(investor));
        when(matchScoreRepository.findByStartupId(new UUID(0L, 10L))).thenReturn(List.of());

        List<MeetingCounterpartResponse> result = service.list(new AuthUser(tidalog));

        assertThat(result).hasSize(1);
        MeetingCounterpartResponse only = result.get(0);
        assertThat(only.userId()).isEqualTo(2L);
        assertThat(only.role()).isEqualTo("INVESTOR");
        assertThat(only.subtitle()).isEqualTo("Investidor Anjo");
        assertThat(only.tipoInvestidor()).isEqualTo("Investidor Anjo");
        assertThat(only.ticketMin()).isEqualByComparingTo("50000");
        assertThat(only.matchScore()).isNull();
    }

    @Test
    void retornoNaoTemEmailNemDocumento() {
        Investor rafael = Investor.builder().id(2L).user(investor).build();
        when(investorRepository.findAll()).thenReturn(List.of(rafael));
        when(userRepository.findAllById(anyIterable())).thenReturn(List.of(investor));
        when(matchScoreRepository.findByStartupId(new UUID(0L, 10L))).thenReturn(List.of());

        List<String> components = Arrays.stream(MeetingCounterpartResponse.class.getRecordComponents())
                .map(RecordComponent::getName)
                .map(String::toLowerCase)
                .toList();
        assertThat(components).noneMatch(name -> name.contains("email") || name.contains("document"));

        MeetingCounterpartResponse only = service.list(new AuthUser(tidalog)).get(0);
        assertThat(only.toString()).doesNotContain("@").doesNotContain("rafael@fundo.com");
        assertThat(only.subtitle()).isEqualTo("Investidor");
    }

    @Test
    void adminRecebe403() {
        User admin = user(1L, Role.ADMIN, "admin@unio.com");

        assertThatThrownBy(() -> service.list(new AuthUser(admin)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    private static User user(Long id, Role role, String email) {
        return User.builder().id(id).role(role).email(email).passwordHash("x").build();
    }

    private static Startup startup(User user, String name, String segment, String stage) {
        return Startup.builder().id(user.getId()).user(user).nome(name).segmento(segment).estagio(stage).build();
    }

    private static MatchScore score(Long investorId, Long startupId, String total, String calculatedAt) {
        return MatchScore.builder()
                .investorId(new UUID(0L, investorId))
                .startupId(new UUID(0L, startupId))
                .totalScore(new BigDecimal(total))
                .calculatedAt(Instant.parse(calculatedAt))
                .build();
    }
}

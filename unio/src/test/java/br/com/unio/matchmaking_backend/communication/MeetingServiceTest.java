package br.com.unio.matchmaking_backend.communication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCreateRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingResponse;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.service.MeetingService;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class MeetingServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");

    private MeetingRepository meetingRepository;
    private MeetingService service;
    private User startup;
    private User investor;

    @BeforeEach
    void setUp() {
        meetingRepository = mock(MeetingRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        StartupRepository startupRepository = mock(StartupRepository.class);
        ParticipantService participantService = new ParticipantService(userRepository, startupRepository);
        service = new MeetingService(meetingRepository, participantService, Clock.fixed(NOW, ZoneOffset.UTC));

        startup = User.builder().id(1L).role(Role.STARTUP).email("startup@unio.com").passwordHash("x").build();
        investor = User.builder().id(2L).role(Role.INVESTOR).email("anjo@unio.com").passwordHash("x").build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(startup));
        when(userRepository.findById(2L)).thenReturn(Optional.of(investor));
        when(startupRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void scheduleCriaReuniaoPendenteComFimCalculado() {
        when(meetingRepository.countOverlapping(anyCollection(), any(), any(), anyCollection(), anyLong())).thenReturn(0L);

        MeetingResponse response = service.schedule(new AuthUser(investor), request(NOW.plus(Duration.ofDays(1)), 45));

        assertThat(response.status()).isEqualTo("PENDENTE");
        assertThat(response.durationMinutes()).isEqualTo(45);
        assertThat(response.endsAt()).isEqualTo(NOW.plus(Duration.ofDays(1)).plus(Duration.ofMinutes(45)));
        assertThat(response.organizer()).isTrue();
        assertThat(response.participant().id()).isEqualTo(1L);
    }

    @Test
    void scheduleNoPassadoEhRecusado() {
        assertThatThrownBy(() -> service.schedule(new AuthUser(investor), request(NOW.minusSeconds(60), 30)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(meetingRepository, never()).save(any());
    }

    @Test
    void scheduleComConflitoDeAgendaDevolve409() {
        when(meetingRepository.countOverlapping(anyCollection(), any(), any(), anyCollection(), anyLong())).thenReturn(1L);

        assertThatThrownBy(() -> service.schedule(new AuthUser(investor), request(NOW.plus(Duration.ofDays(1)), 30)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void apenasConvidadoPodeAceitar() {
        Meeting meeting = meeting(MeetingStatus.PENDENTE, NOW.plus(Duration.ofDays(1)));
        when(meetingRepository.findById(5L)).thenReturn(Optional.of(meeting));

        assertThatThrownBy(() -> service.accept(new AuthUser(investor), 5L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void convidadoAceitaEReuniaoFicaConfirmada() {
        Meeting meeting = meeting(MeetingStatus.PENDENTE, NOW.plus(Duration.ofDays(1)));
        when(meetingRepository.findById(5L)).thenReturn(Optional.of(meeting));
        when(meetingRepository.countOverlapping(anyCollection(), any(), any(), anyCollection(), eq(5L))).thenReturn(0L);

        MeetingResponse response = service.accept(new AuthUser(startup), 5L);

        assertThat(response.status()).isEqualTo("CONFIRMADA");
        assertThat(response.organizer()).isFalse();
    }

    @Test
    void cancelarReuniaoJaRecusadaDevolve409() {
        Meeting meeting = meeting(MeetingStatus.RECUSADA, NOW.plus(Duration.ofDays(1)));
        when(meetingRepository.findById(5L)).thenReturn(Optional.of(meeting));

        assertThatThrownBy(() -> service.cancel(new AuthUser(investor), 5L, "mudança de planos"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void cancelGuardaMotivo() {
        Meeting meeting = meeting(MeetingStatus.CONFIRMADA, NOW.plus(Duration.ofDays(1)));
        when(meetingRepository.findById(5L)).thenReturn(Optional.of(meeting));

        MeetingResponse response = service.cancel(new AuthUser(startup), 5L, "  imprevisto  ");

        assertThat(response.status()).isEqualTo("CANCELADA");
        assertThat(response.cancelReason()).isEqualTo("imprevisto");
    }

    @Test
    void concluirAntesDoInicioEhRecusado() {
        Meeting meeting = meeting(MeetingStatus.CONFIRMADA, NOW.plus(Duration.ofHours(2)));
        when(meetingRepository.findById(5L)).thenReturn(Optional.of(meeting));

        assertThatThrownBy(() -> service.complete(new AuthUser(startup), 5L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void concluirDepoisDoInicioMarcaRealizada() {
        Meeting meeting = meeting(MeetingStatus.CONFIRMADA, NOW.minus(Duration.ofHours(1)));
        when(meetingRepository.findById(5L)).thenReturn(Optional.of(meeting));

        assertThat(service.complete(new AuthUser(startup), 5L).status()).isEqualTo("REALIZADA");
    }

    @Test
    void reuniaoDeTerceirosDevolve404() {
        User outsider = User.builder().id(7L).role(Role.STARTUP).email("x@unio.com").passwordHash("x").build();
        when(meetingRepository.findById(5L)).thenReturn(Optional.of(meeting(MeetingStatus.PENDENTE, NOW.plusSeconds(3600))));

        assertThatThrownBy(() -> service.get(new AuthUser(outsider), 5L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    private static MeetingCreateRequest request(Instant startsAt, int minutes) {
        return new MeetingCreateRequest(1L, "Apresentação", "Tese e tração", startsAt, minutes,
                "https://meet.example.com/abc");
    }

    /** Reunião proposta pelo investidor (organizador) à startup (convidada). */
    private Meeting meeting(MeetingStatus status, Instant startsAt) {
        return Meeting.builder()
                .id(5L)
                .organizer(investor)
                .invitee(startup)
                .title("Apresentação")
                .startsAt(startsAt)
                .endsAt(startsAt.plus(Duration.ofMinutes(30)))
                .status(status)
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();
    }
}

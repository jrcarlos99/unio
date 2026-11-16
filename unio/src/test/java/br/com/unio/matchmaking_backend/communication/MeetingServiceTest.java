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
import br.com.unio.matchmaking_backend.communication.dto.MeetingCounterProposalRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCreateRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingDetailsRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingLocationDto;
import br.com.unio.matchmaking_backend.communication.dto.MeetingResponse;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingFormat;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.service.MeetingService;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

class MeetingServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    private static final Instant T1 = NOW.plus(Duration.ofDays(1));
    private static final Instant T2 = NOW.plus(Duration.ofDays(2));
    private static final Instant T3 = NOW.plus(Duration.ofDays(3));

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
        when(meetingRepository.saveAndFlush(any(Meeting.class))).thenAnswer(inv -> inv.getArgument(0));
        when(meetingRepository.countOverlapping(anyCollection(), any(), any(), anyCollection(), anyLong())).thenReturn(0L);
    }

    // ---------------------------------------------------------------- criação

    @Test
    void scheduleCriaReuniaoPendenteComFimCalculado() {
        MeetingResponse response = service.schedule(new AuthUser(investor), request(T1, 45));

        assertThat(response.status()).isEqualTo("PENDENTE");
        assertThat(response.durationMinutes()).isEqualTo(45);
        assertThat(response.endsAt()).isEqualTo(T1.plus(Duration.ofMinutes(45)));
        assertThat(response.organizer()).isTrue();
        assertThat(response.participant().id()).isEqualTo(1L);
    }

    @Test
    void scheduleSoComStartsAtViraUmHorarioSugerido() {
        MeetingResponse response = service.schedule(new AuthUser(investor), request(T1, 30));

        assertThat(response.suggestedTimes()).containsExactly(T1);
        assertThat(response.proposedByMe()).isTrue();
        assertThat(response.format()).isEqualTo("ONLINE");
        assertThat(response.location()).isNull();
    }

    @Test
    void scheduleComTresHorariosOrdenaEUsaOPrimeiroComoInicio() {
        MeetingResponse response = service.schedule(new AuthUser(investor),
                proposal(List.of(T3, T1, T2), MeetingFormat.ONLINE, null));

        assertThat(response.suggestedTimes()).containsExactly(T1, T2, T3);
        assertThat(response.startsAt()).isEqualTo(T1);
        assertThat(response.endsAt()).isEqualTo(T1.plus(Duration.ofMinutes(45)));
        assertThat(response.subject()).isEqualTo("Apresentação de pitch");
        assertThat(response.title()).isEqualTo("Apresentação de pitch");
        assertThat(response.message()).isEqualTo("Queremos apresentar a tração do trimestre.");
    }

    @Test
    void scheduleComSuggestedTimesIgnoraOStartsAt() {
        MeetingCreateRequest request = new MeetingCreateRequest(1L, "Conversa", null, T3, 30, null,
                List.of(T1), null, null, null, null, null, null);

        assertThat(service.schedule(new AuthUser(investor), request).suggestedTimes()).containsExactly(T1);
    }

    @Test
    void scheduleComQuatroHorariosDevolve400() {
        assertStatus(() -> service.schedule(new AuthUser(investor),
                proposal(List.of(T1, T2, T3, T3.plusSeconds(3600)), MeetingFormat.ONLINE, null)), HttpStatus.BAD_REQUEST);
        verify(meetingRepository, never()).save(any());
    }

    @Test
    void scheduleComHorariosRepetidosDevolve400() {
        assertStatus(() -> service.schedule(new AuthUser(investor),
                proposal(List.of(T1, T1), MeetingFormat.ONLINE, null)), HttpStatus.BAD_REQUEST);
    }

    @Test
    void scheduleNoPassadoEhRecusado() {
        assertStatus(() -> service.schedule(new AuthUser(investor), request(NOW.minusSeconds(60), 30)),
                HttpStatus.BAD_REQUEST);
        verify(meetingRepository, never()).save(any());
    }

    @Test
    void scheduleSemTituloNemAssuntoDevolve400() {
        MeetingCreateRequest request = new MeetingCreateRequest(1L, " ", null, T1, 30, null);

        assertStatus(() -> service.schedule(new AuthUser(investor), request), HttpStatus.BAD_REQUEST);
    }

    @Test
    void scheduleComLocalEmReuniaoOnlineDevolve400() {
        assertStatus(() -> service.schedule(new AuthUser(investor),
                proposal(List.of(T1), MeetingFormat.ONLINE, "Porto Digital")), HttpStatus.BAD_REQUEST);
    }

    @Test
    void schedulePresencialGuardaOLocal() {
        MeetingResponse response = service.schedule(new AuthUser(investor),
                proposal(List.of(T1), MeetingFormat.PRESENCIAL, "Porto Digital"));

        assertThat(response.format()).isEqualTo("PRESENCIAL");
        assertThat(response.location()).isEqualTo(new MeetingLocationDto("Porto Digital", "Rua do Apolo, 181", null));
    }

    // ------------------------------------------------------- conflito (D034)

    @Test
    void scheduleComConflitoDeAgendaDevolve409() {
        when(meetingRepository.countOverlapping(anyCollection(), any(), any(), anyCollection(), anyLong())).thenReturn(1L);

        assertStatus(() -> service.schedule(new AuthUser(investor), request(T1, 30)), HttpStatus.CONFLICT);
    }

    @Test
    void scheduleComAlgunsHorariosOcupadosCriaAReuniao() {
        when(meetingRepository.countOverlapping(anyCollection(), eq(T1), any(), anyCollection(), anyLong())).thenReturn(1L);
        when(meetingRepository.countOverlapping(anyCollection(), eq(T2), any(), anyCollection(), anyLong())).thenReturn(1L);

        MeetingResponse response = service.schedule(new AuthUser(investor),
                proposal(List.of(T1, T2, T3), MeetingFormat.ONLINE, null));

        assertThat(response.status()).isEqualTo("PENDENTE");
        assertThat(response.suggestedTimes()).containsExactly(T1, T2, T3);
    }

    @Test
    void scheduleComTodosOsHorariosOcupadosDevolve409() {
        when(meetingRepository.countOverlapping(anyCollection(), any(), any(), anyCollection(), anyLong())).thenReturn(1L);

        assertStatus(() -> service.schedule(new AuthUser(investor),
                proposal(List.of(T1, T2, T3), MeetingFormat.ONLINE, null)), HttpStatus.CONFLICT);
    }

    @Test
    @SuppressWarnings("unchecked")
    void conflitoContaSoReunioesConfirmadas() {
        service.schedule(new AuthUser(investor), request(T1, 30));

        ArgumentCaptor<Collection<MeetingStatus>> statuses = ArgumentCaptor.forClass(Collection.class);
        verify(meetingRepository).countOverlapping(anyCollection(), eq(T1), any(), statuses.capture(), anyLong());
        assertThat(statuses.getValue()).containsExactlyInAnyOrderElementsOf(EnumSet.of(MeetingStatus.CONFIRMADA));
        assertThat(MeetingStatus.PENDENTE.blocksSchedule()).isFalse();
    }

    // ----------------------------------------------------------------- aceite

    @Test
    void apenasConvidadoPodeAceitar() {
        stub(meeting(MeetingStatus.PENDENTE, investor, T1));

        assertStatus(() -> service.accept(new AuthUser(investor), 5L), HttpStatus.FORBIDDEN);
    }

    @Test
    void aceitarSemCorpoComUmHorarioConfirma() {
        stub(meeting(MeetingStatus.PENDENTE, investor, T1));

        MeetingResponse response = service.accept(new AuthUser(startup), 5L);

        assertThat(response.status()).isEqualTo("CONFIRMADA");
        assertThat(response.startsAt()).isEqualTo(T1);
        assertThat(response.organizer()).isFalse();
        assertThat(response.proposedByMe()).isFalse();
    }

    @Test
    void aceitarComHorarioSugeridoConfirmaNoEscolhido() {
        stub(meeting(MeetingStatus.PENDENTE, investor, T1, T2, T3));

        MeetingResponse response = service.accept(new AuthUser(startup), 5L, T2);

        assertThat(response.status()).isEqualTo("CONFIRMADA");
        assertThat(response.startsAt()).isEqualTo(T2);
        assertThat(response.endsAt()).isEqualTo(T2.plus(Duration.ofMinutes(30)));
    }

    @Test
    void aceitarComHorarioForaDosSugeridosDevolve400() {
        stub(meeting(MeetingStatus.PENDENTE, investor, T1, T2));

        assertStatus(() -> service.accept(new AuthUser(startup), 5L, T3), HttpStatus.BAD_REQUEST);
    }

    @Test
    void aceitarSemCorpoComMaisDeUmHorarioDevolve400() {
        stub(meeting(MeetingStatus.PENDENTE, investor, T1, T2, T3));

        assertStatus(() -> service.accept(new AuthUser(startup), 5L), HttpStatus.BAD_REQUEST);
    }

    @Test
    void aceitarHorarioQueConflitaComConfirmadaDevolve409() {
        stub(meeting(MeetingStatus.PENDENTE, investor, T1, T2));
        when(meetingRepository.countOverlapping(anyCollection(), eq(T2), any(), anyCollection(), eq(5L))).thenReturn(1L);

        assertStatus(() -> service.accept(new AuthUser(startup), 5L, T2), HttpStatus.CONFLICT);
        assertThat(service.accept(new AuthUser(startup), 5L, T1).status()).isEqualTo("CONFIRMADA");
    }

    // ------------------------------------------- contraproposta e remarcação

    @Test
    void contrapropostaPeloConvidadoPassaAVezAoOrganizador() {
        Meeting meeting = meeting(MeetingStatus.PENDENTE, investor, T1, T2);
        stub(meeting);

        MeetingResponse response = service.counterPropose(new AuthUser(startup), 5L,
                new MeetingCounterProposalRequest(List.of(T3), "Pode ser nesse dia?"));

        assertThat(response.status()).isEqualTo("PENDENTE");
        assertThat(response.suggestedTimes()).containsExactly(T3);
        assertThat(response.startsAt()).isEqualTo(T3);
        assertThat(response.proposedByMe()).isTrue();
        assertThat(response.message()).isEqualTo("Pode ser nesse dia?");
        assertThat(meeting.getProposer()).isEqualTo(startup);
        assertThat(meeting.getOrganizer()).isEqualTo(investor);

        // Agora quem responde é o organizador; a startup não aceita a própria proposta
        assertStatus(() -> service.accept(new AuthUser(startup), 5L), HttpStatus.FORBIDDEN);
        assertThat(service.accept(new AuthUser(investor), 5L).status()).isEqualTo("CONFIRMADA");
    }

    @Test
    void contrapropostaDeQuemFezAPropostaVigenteDevolve403() {
        stub(meeting(MeetingStatus.PENDENTE, investor, T1));

        assertStatus(() -> service.counterPropose(new AuthUser(investor), 5L,
                new MeetingCounterProposalRequest(List.of(T2), null)), HttpStatus.FORBIDDEN);
    }

    @Test
    void organizadorFazContrapropostaDepoisDaDoConvidado() {
        Meeting meeting = meeting(MeetingStatus.PENDENTE, startup, T1);
        stub(meeting);

        MeetingResponse response = service.counterPropose(new AuthUser(investor), 5L,
                new MeetingCounterProposalRequest(List.of(T2, T3), null));

        assertThat(response.suggestedTimes()).containsExactly(T2, T3);
        assertThat(response.organizer()).isTrue();
        assertThat(meeting.getProposer()).isEqualTo(investor);
    }

    @Test
    void remarcarConfirmadaVoltaParaPendente() {
        Meeting meeting = meeting(MeetingStatus.CONFIRMADA, investor, T1);
        stub(meeting);

        // Quem fez a proposta também pode remarcar uma confirmada
        MeetingResponse response = service.counterPropose(new AuthUser(investor), 5L,
                new MeetingCounterProposalRequest(List.of(T2, T3), null));

        assertThat(response.status()).isEqualTo("PENDENTE");
        assertThat(response.suggestedTimes()).containsExactly(T2, T3);
        assertThat(response.startsAt()).isEqualTo(T2);
        assertThat(response.durationMinutes()).isEqualTo(30);
        assertThat(meeting.getSuggestedTimes()).extracting("position").containsExactly(1, 2);
        assertThat(service.accept(new AuthUser(startup), 5L, T3).status()).isEqualTo("CONFIRMADA");
    }

    @Test
    void contrapropostaComQuatroHorariosDevolve400() {
        stub(meeting(MeetingStatus.CONFIRMADA, investor, T1));

        assertStatus(() -> service.counterPropose(new AuthUser(startup), 5L,
                new MeetingCounterProposalRequest(List.of(T1, T2, T3, T3.plusSeconds(60)), null)), HttpStatus.BAD_REQUEST);
    }

    @Test
    void contrapropostaEmReuniaoRecusadaDevolve409() {
        stub(meeting(MeetingStatus.RECUSADA, investor, T1));

        assertStatus(() -> service.counterPropose(new AuthUser(startup), 5L,
                new MeetingCounterProposalRequest(List.of(T2), null)), HttpStatus.CONFLICT);
    }

    // ---------------------------------------------------------- link e local

    @Test
    void detailsSoPeloOrganizador() {
        stub(meeting(MeetingStatus.CONFIRMADA, investor, T1));

        assertStatus(() -> service.updateDetails(new AuthUser(startup), 5L,
                new MeetingDetailsRequest("https://meet.example.com/nova", null)), HttpStatus.FORBIDDEN);

        MeetingResponse response = service.updateDetails(new AuthUser(investor), 5L,
                new MeetingDetailsRequest("https://meet.example.com/nova", null));
        assertThat(response.meetingUrl()).isEqualTo("https://meet.example.com/nova");
    }

    @Test
    void detailsComLocalEmReuniaoOnlineDevolve400() {
        stub(meeting(MeetingStatus.PENDENTE, investor, T1));

        assertStatus(() -> service.updateDetails(new AuthUser(investor), 5L,
                new MeetingDetailsRequest(null, new MeetingLocationDto("Porto Digital", "Rua do Apolo", null))),
                HttpStatus.BAD_REQUEST);
    }

    @Test
    void detailsAtualizaOLocalDaPresencial() {
        Meeting meeting = meeting(MeetingStatus.CONFIRMADA, investor, T1);
        meeting.setFormat(MeetingFormat.PRESENCIAL);
        stub(meeting);

        MeetingResponse response = service.updateDetails(new AuthUser(investor), 5L,
                new MeetingDetailsRequest(null, new MeetingLocationDto(" Porto Digital ", "Rua do Apolo, 181", "Sala 3")));

        assertThat(response.location()).isEqualTo(new MeetingLocationDto("Porto Digital", "Rua do Apolo, 181", "Sala 3"));
    }

    @Test
    void detailsEmReuniaoCanceladaDevolve409() {
        stub(meeting(MeetingStatus.CANCELADA, investor, T1));

        assertStatus(() -> service.updateDetails(new AuthUser(investor), 5L,
                new MeetingDetailsRequest("https://meet.example.com/x", null)), HttpStatus.CONFLICT);
    }

    // ------------------------------------------------------ listagem e outros

    @Test
    void listarComIntervaloConsideraOsHorariosSugeridosDaPendente() {
        Meeting pendente = meeting(MeetingStatus.PENDENTE, investor, T1, T3);
        when(meetingRepository.findAllByParticipant(1L)).thenReturn(List.of(pendente));

        assertThat(service.listMine(new AuthUser(startup), null, T3.minusSeconds(60), T3.plusSeconds(60))).hasSize(1);
        assertThat(service.listMine(new AuthUser(startup), null, T2.minusSeconds(60), T2.plusSeconds(60))).isEmpty();
        assertStatus(() -> service.listMine(new AuthUser(startup), null, T2, T1), HttpStatus.BAD_REQUEST);
    }

    @Test
    void cancelarReuniaoJaRecusadaDevolve409() {
        stub(meeting(MeetingStatus.RECUSADA, investor, T1));

        assertStatus(() -> service.cancel(new AuthUser(investor), 5L, "mudança de planos"), HttpStatus.CONFLICT);
    }

    @Test
    void cancelGuardaMotivo() {
        stub(meeting(MeetingStatus.CONFIRMADA, investor, T1));

        MeetingResponse response = service.cancel(new AuthUser(startup), 5L, "  imprevisto  ");

        assertThat(response.status()).isEqualTo("CANCELADA");
        assertThat(response.cancelReason()).isEqualTo("imprevisto");
    }

    @Test
    void concluirAntesDoInicioEhRecusado() {
        stub(meeting(MeetingStatus.CONFIRMADA, investor, NOW.plus(Duration.ofHours(2))));

        assertStatus(() -> service.complete(new AuthUser(startup), 5L), HttpStatus.CONFLICT);
    }

    @Test
    void concluirDepoisDoInicioMarcaRealizada() {
        stub(meeting(MeetingStatus.CONFIRMADA, investor, NOW.minus(Duration.ofHours(1))));

        assertThat(service.complete(new AuthUser(startup), 5L).status()).isEqualTo("REALIZADA");
    }

    @Test
    void reuniaoDeTerceirosDevolve404() {
        User outsider = User.builder().id(7L).role(Role.STARTUP).email("x@unio.com").passwordHash("x").build();
        stub(meeting(MeetingStatus.PENDENTE, investor, NOW.plusSeconds(3600)));

        assertStatus(() -> service.get(new AuthUser(outsider), 5L), HttpStatus.NOT_FOUND);
    }

    // ---------------------------------------------------------------- apoio

    private static MeetingCreateRequest request(Instant startsAt, int minutes) {
        return new MeetingCreateRequest(1L, "Apresentação", "Tese e tração", startsAt, minutes,
                "https://meet.example.com/abc");
    }

    /** Proposta no formato novo, sem title (o subject vira o título). */
    private static MeetingCreateRequest proposal(List<Instant> times, MeetingFormat format, String locationName) {
        return new MeetingCreateRequest(1L, null, null, null, 45, null, times,
                "Apresentação de pitch", "Queremos apresentar a tração do trimestre.", format,
                locationName, locationName == null ? null : "Rua do Apolo, 181", null);
    }

    private void stub(Meeting meeting) {
        when(meetingRepository.findById(5L)).thenReturn(Optional.of(meeting));
    }

    /** Reunião criada pelo investidor (organizador) com a startup (convidada). */
    private Meeting meeting(MeetingStatus status, User proposer, Instant... times) {
        Meeting meeting = Meeting.builder()
                .id(5L)
                .organizer(investor)
                .invitee(startup)
                .proposer(proposer)
                .title("Apresentação")
                .startsAt(times[0])
                .endsAt(times[0].plus(Duration.ofMinutes(30)))
                .status(status)
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();
        meeting.replaceSuggestedTimes(List.of(times));
        return meeting;
    }

    private static void assertStatus(Runnable call, HttpStatusCode expected) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(expected);
    }
}

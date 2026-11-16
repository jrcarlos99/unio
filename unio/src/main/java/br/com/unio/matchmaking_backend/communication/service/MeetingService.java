package br.com.unio.matchmaking_backend.communication.service;

import br.com.unio.matchmaking_backend.auth.entity.User;
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
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * T09b (RF05) — agendamento de reuniões entre startup e investidor.
 *
 * <p>Regras desde a V24 (docs/decisoes.md):
 * <ul>
 *   <li>D032: a proposta tem de 1 a 3 horários sugeridos; o aceite escolhe um deles.</li>
 *   <li>D033: quem responde uma PENDENTE é o participante que não fez a proposta vigente
 *       ({@code proposer}); contraproposta e remarcação trocam o proposer.</li>
 *   <li>D034: só reunião CONFIRMADA ocupa a agenda. Na criação, 409 só se todos os
 *       horários sugeridos conflitarem; no aceite, 409 se o escolhido conflitar.</li>
 *   <li>D036: só o organizador (quem criou) edita link e local.</li>
 *   <li>D038: o corpo antigo, só com startsAt, continua valendo.</li>
 * </ul>
 */
@Service
public class MeetingService {

    static final int MAX_SUGGESTED_TIMES = 3;
    private static final Set<MeetingStatus> SCHEDULE_BLOCKING_STATUSES = EnumSet.of(MeetingStatus.CONFIRMADA);
    private static final long NO_EXCLUSION = -1L;
    static final String CONFLICT_MESSAGE = "Esse horário já está ocupado por uma reunião confirmada de um dos participantes";

    private final MeetingRepository meetingRepository;
    private final ParticipantService participantService;
    private final Clock clock;

    @Autowired
    public MeetingService(MeetingRepository meetingRepository, ParticipantService participantService) {
        this(meetingRepository, participantService, Clock.systemUTC());
    }

    /** Construtor com relógio controlável, usado nos testes. */
    public MeetingService(MeetingRepository meetingRepository, ParticipantService participantService, Clock clock) {
        this.meetingRepository = meetingRepository;
        this.participantService = participantService;
        this.clock = clock;
    }

    @Transactional
    public MeetingResponse schedule(AuthUser authUser, MeetingCreateRequest request) {
        User me = participantService.requireCommunicatingUser(authUser);
        User other = participantService.requireCounterpart(me, request.participantId());

        List<Instant> times = validateSuggestedTimes(resolveSuggestedTimes(request));
        Duration duration = Duration.ofMinutes(request.durationMinutes());
        MeetingFormat format = request.format() == null ? MeetingFormat.ONLINE : request.format();
        Location location = validateLocation(format,
                request.locationName(), request.locationAddress(), request.locationReference());
        String title = resolveTitle(request.title(), request.subject());

        // D034: só bloqueia se nenhum dos horários estiver livre
        boolean allConflict = times.stream().allMatch(time ->
                hasConflict(me.getId(), other.getId(), time, time.plus(duration), NO_EXCLUSION));
        if (allConflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, times.size() == 1
                    ? CONFLICT_MESSAGE
                    : "Todos os horários sugeridos estão ocupados por reuniões confirmadas de um dos participantes");
        }

        Meeting meeting = Meeting.builder()
                .organizer(me)
                .invitee(other)
                .proposer(me)
                .title(title)
                .agenda(blankToNull(request.agenda()))
                .subject(blankToNull(request.subject()))
                .message(blankToNull(request.message()))
                .format(format)
                .locationName(location.name())
                .locationAddress(location.address())
                .locationReference(location.reference())
                .startsAt(times.get(0))
                .endsAt(times.get(0).plus(duration))
                .meetingUrl(blankToNull(request.meetingUrl()))
                .status(MeetingStatus.PENDENTE)
                .build();
        meeting.replaceSuggestedTimes(times);

        return toResponse(meetingRepository.save(meeting), me.getId());
    }

    /**
     * Reuniões do usuário. {@code from}/{@code to} (opcionais) filtram as que têm algum
     * horário em [from, to): o confirmado ou, numa PENDENTE, um dos sugeridos.
     */
    @Transactional(readOnly = true)
    public List<MeetingResponse> listMine(AuthUser authUser, MeetingStatus status, Instant from, Instant to) {
        User me = participantService.requireCommunicatingUser(authUser);
        if (from != null && to != null && !from.isBefore(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O início do intervalo deve ser antes do fim");
        }
        return meetingRepository.findAllByParticipant(me.getId()).stream()
                .filter(meeting -> status == null || meeting.getStatus() == status)
                .filter(meeting -> from == null && to == null || inRange(meeting, from, to))
                .map(meeting -> toResponse(meeting, me.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MeetingResponse> listMine(AuthUser authUser, MeetingStatus status) {
        return listMine(authUser, status, null, null);
    }

    @Transactional(readOnly = true)
    public MeetingResponse get(AuthUser authUser, Long meetingId) {
        return toResponse(requireParticipantMeeting(authUser, meetingId), authUser.getId());
    }

    /**
     * Quem responde a proposta vigente aceita um dos horários sugeridos (D032, D033).
     * Com mais de um horário, {@code chosen} é obrigatório. A agenda dos dois é checada
     * de novo contra as reuniões confirmadas (D034).
     */
    @Transactional
    public MeetingResponse accept(AuthUser authUser, Long meetingId, Instant chosen) {
        Meeting meeting = requireParticipantMeeting(authUser, meetingId);
        requireResponder(meeting, authUser.getId());
        requireStatus(meeting, MeetingStatus.PENDENTE);

        List<Instant> suggested = meeting.suggestedInstants();
        Instant startsAt;
        if (chosen == null) {
            if (suggested.size() != 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Escolha um dos horários sugeridos (startsAt)");
            }
            startsAt = suggested.get(0);
        } else {
            Instant normalized = normalize(chosen);
            startsAt = suggested.stream().filter(time -> normalize(time).equals(normalized)).findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "O horário escolhido não está entre os sugeridos"));
        }

        if (!startsAt.isAfter(now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O horário da reunião já passou");
        }
        Instant endsAt = startsAt.plus(duration(meeting));
        if (hasConflict(meeting.getOrganizer().getId(), meeting.getInvitee().getId(), startsAt, endsAt, meeting.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, CONFLICT_MESSAGE);
        }

        meeting.setStartsAt(startsAt);
        meeting.setEndsAt(endsAt);
        meeting.setStatus(MeetingStatus.CONFIRMADA);
        return toResponse(meetingRepository.save(meeting), authUser.getId());
    }

    @Transactional
    public MeetingResponse accept(AuthUser authUser, Long meetingId) {
        return accept(authUser, meetingId, null);
    }

    @Transactional
    public MeetingResponse decline(AuthUser authUser, Long meetingId) {
        Meeting meeting = requireParticipantMeeting(authUser, meetingId);
        requireResponder(meeting, authUser.getId());
        requireStatus(meeting, MeetingStatus.PENDENTE);

        meeting.setStatus(MeetingStatus.RECUSADA);
        return toResponse(meetingRepository.save(meeting), authUser.getId());
    }

    /**
     * Contraproposta (PENDENTE, só quem não fez a proposta vigente) ou remarcação
     * (CONFIRMADA, qualquer participante), D033. Troca os horários, passa o proposer
     * para quem chamou e deixa a reunião PENDENTE para o outro lado responder.
     */
    @Transactional
    public MeetingResponse counterPropose(AuthUser authUser, Long meetingId, MeetingCounterProposalRequest request) {
        Meeting meeting = requireParticipantMeeting(authUser, meetingId);
        if (meeting.getStatus() == MeetingStatus.PENDENTE) {
            if (meeting.isProposer(authUser.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Sua proposta está aguardando a resposta do outro participante");
            }
        } else if (meeting.getStatus() != MeetingStatus.CONFIRMADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Operação inválida para reunião com status " + meeting.getStatus());
        }

        List<Instant> times = validateSuggestedTimes(request.suggestedTimes());
        Duration duration = duration(meeting);
        boolean allConflict = times.stream().allMatch(time -> hasConflict(meeting.getOrganizer().getId(),
                meeting.getInvitee().getId(), time, time.plus(duration), meeting.getId()));
        if (allConflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Todos os horários sugeridos estão ocupados por reuniões confirmadas de um dos participantes");
        }

        User me = participantService.requireUser(authUser.getId());
        meeting.replaceSuggestedTimes(times);
        meeting.setProposer(me);
        meeting.setStartsAt(times.get(0));
        meeting.setEndsAt(times.get(0).plus(duration));
        meeting.setStatus(MeetingStatus.PENDENTE);
        String message = blankToNull(request.message());
        if (message != null) {
            meeting.setMessage(message);
        }
        // Flush já aqui: os horários removidos saem do banco antes de qualquer
        // insert seguinte na mesma transação (UNIQUE (meeting_id, position))
        return toResponse(meetingRepository.saveAndFlush(meeting), authUser.getId());
    }

    /** O organizador atualiza link e/ou local enquanto a reunião está PENDENTE ou CONFIRMADA (D036). */
    @Transactional
    public MeetingResponse updateDetails(AuthUser authUser, Long meetingId, MeetingDetailsRequest request) {
        Meeting meeting = requireParticipantMeeting(authUser, meetingId);
        if (!meeting.isOrganizer(authUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Só quem organiza a reunião pode alterar o link ou o local");
        }
        if (!meeting.getStatus().isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Só reuniões pendentes ou confirmadas podem ser alteradas");
        }
        if (request == null || request.meetingUrl() == null && request.location() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o link ou o local");
        }

        if (request.meetingUrl() != null) {
            meeting.setMeetingUrl(blankToNull(request.meetingUrl()));
        }
        MeetingLocationDto location = request.location();
        if (location != null) {
            Location valid = validateLocation(meeting.getFormat(), location.name(), location.address(),
                    location.reference());
            if (valid.name() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome do local");
            }
            meeting.setLocationName(valid.name());
            meeting.setLocationAddress(valid.address());
            meeting.setLocationReference(valid.reference());
        }
        return toResponse(meetingRepository.save(meeting), authUser.getId());
    }

    /** Qualquer participante cancela uma reunião pendente ou confirmada. */
    @Transactional
    public MeetingResponse cancel(AuthUser authUser, Long meetingId, String reason) {
        Meeting meeting = requireParticipantMeeting(authUser, meetingId);
        if (!meeting.getStatus().isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Só reuniões pendentes ou confirmadas podem ser canceladas");
        }

        meeting.setStatus(MeetingStatus.CANCELADA);
        meeting.setCancelReason(blankToNull(reason));
        return toResponse(meetingRepository.save(meeting), authUser.getId());
    }

    /** Marca como realizada uma reunião confirmada cujo horário já começou (libera a avaliação, T12). */
    @Transactional
    public MeetingResponse complete(AuthUser authUser, Long meetingId) {
        Meeting meeting = requireParticipantMeeting(authUser, meetingId);
        requireStatus(meeting, MeetingStatus.CONFIRMADA);

        if (meeting.getStartsAt().isAfter(now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A reunião só pode ser concluída depois do horário de início");
        }

        meeting.setStatus(MeetingStatus.REALIZADA);
        return toResponse(meetingRepository.save(meeting), authUser.getId());
    }

    /** Usado também pela avaliação pós-interação (T12). Reunião de terceiros responde 404. */
    public Meeting requireParticipantMeeting(AuthUser authUser, Long meetingId) {
        participantService.requireCommunicatingUser(authUser);
        return meetingRepository.findById(meetingId)
                .filter(meeting -> meeting.hasParticipant(authUser.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reunião não encontrada"));
    }

    // -------------------------------------------------------------------------
    // Validações
    // -------------------------------------------------------------------------

    /** D038: sem suggestedTimes, o startsAt do contrato antigo vira uma lista de 1. */
    private static List<Instant> resolveSuggestedTimes(MeetingCreateRequest request) {
        if (request.suggestedTimes() != null && !request.suggestedTimes().isEmpty()) {
            return request.suggestedTimes();
        }
        if (request.startsAt() != null) {
            return List.of(request.startsAt());
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe de 1 a 3 horários sugeridos");
    }

    /** 1 a 3 horários, no futuro, sem repetidos; devolve em ordem cronológica. */
    private List<Instant> validateSuggestedTimes(List<Instant> times) {
        if (times == null || times.isEmpty() || times.size() > MAX_SUGGESTED_TIMES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe de 1 a 3 horários sugeridos");
        }
        if (times.stream().anyMatch(Objects::isNull)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Horário sugerido inválido");
        }
        List<Instant> normalized = times.stream().map(MeetingService::normalize).sorted().toList();
        if (new HashSet<>(normalized).size() != normalized.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Há horários sugeridos repetidos");
        }
        Instant now = now();
        if (normalized.stream().anyMatch(time -> !time.isAfter(now))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A reunião deve ser marcada para o futuro");
        }
        return normalized;
    }

    /** O subject vira o título quando o title não vem (D038). */
    private static String resolveTitle(String title, String subject) {
        String resolved = blankToNull(title);
        if (resolved == null) {
            resolved = blankToNull(subject);
        }
        if (resolved == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O título ou o assunto é obrigatório");
        }
        return resolved;
    }

    private record Location(String name, String address, String reference) {
    }

    /** Local só existe em reunião PRESENCIAL (D035). */
    private static Location validateLocation(MeetingFormat format, String name, String address, String reference) {
        Location location = new Location(blankToNull(name), blankToNull(address), blankToNull(reference));
        boolean informed = location.name() != null || location.address() != null || location.reference() != null;
        if (informed && format != MeetingFormat.PRESENCIAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O local só pode ser informado em reunião presencial");
        }
        return location;
    }

    private boolean hasConflict(Long userA, Long userB, Instant startsAt, Instant endsAt, Long excludeId) {
        return meetingRepository.countOverlapping(
                List.of(userA, userB), startsAt, endsAt, SCHEDULE_BLOCKING_STATUSES, excludeId) > 0;
    }

    private static void requireResponder(Meeting meeting, Long userId) {
        if (!meeting.isResponder(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Apenas quem recebeu a proposta pode responder");
        }
    }

    private static void requireStatus(Meeting meeting, MeetingStatus expected) {
        if (meeting.getStatus() != expected) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Operação inválida para reunião com status " + meeting.getStatus());
        }
    }

    private static boolean inRange(Meeting meeting, Instant from, Instant to) {
        List<Instant> times = meeting.getStatus() == MeetingStatus.PENDENTE
                ? meeting.suggestedInstants()
                : List.of(meeting.getStartsAt());
        return times.stream().anyMatch(time ->
                (from == null || !time.isBefore(from)) && (to == null || time.isBefore(to)));
    }

    private static Duration duration(Meeting meeting) {
        return Duration.between(meeting.getStartsAt(), meeting.getEndsAt());
    }

    // -------------------------------------------------------------------------
    // Resposta
    // -------------------------------------------------------------------------

    private MeetingResponse toResponse(Meeting meeting, Long currentUserId) {
        int durationMinutes = (int) duration(meeting).toMinutes();
        MeetingLocationDto location = meeting.getLocationName() == null && meeting.getLocationAddress() == null
                ? null
                : new MeetingLocationDto(meeting.getLocationName(), meeting.getLocationAddress(),
                        meeting.getLocationReference());
        MeetingFormat format = meeting.getFormat() == null ? MeetingFormat.ONLINE : meeting.getFormat();
        return new MeetingResponse(
                meeting.getId(),
                meeting.getTitle(),
                meeting.getAgenda(),
                meeting.getStartsAt(),
                meeting.getEndsAt(),
                durationMinutes,
                meeting.getMeetingUrl(),
                meeting.getStatus().name(),
                meeting.getCancelReason(),
                meeting.isOrganizer(currentUserId),
                participantService.toDto(meeting.otherParticipant(currentUserId)),
                meeting.getCreatedAt(),
                meeting.getUpdatedAt(),
                meeting.getSubject(),
                meeting.getMessage(),
                format.name(),
                location,
                meeting.suggestedInstants(),
                meeting.isProposer(currentUserId));
    }

    private Instant now() {
        return Instant.now(clock);
    }

    /** Agenda trabalha em minutos: segundos e frações não entram na comparação. */
    private static Instant normalize(Instant instant) {
        return instant.truncatedTo(ChronoUnit.SECONDS);
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String stripped = value.strip();
        return stripped.isEmpty() ? null : stripped;
    }
}

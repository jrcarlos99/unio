package br.com.unio.matchmaking_backend.communication.service;

import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCreateRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingResponse;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** T09b (RF05) — agendamento de reuniões entre startup e investidor. */
@Service
public class MeetingService {

    private static final Set<MeetingStatus> ACTIVE_STATUSES = EnumSet.of(MeetingStatus.PENDENTE, MeetingStatus.CONFIRMADA);
    private static final long NO_EXCLUSION = -1L;

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

        Instant startsAt = request.startsAt();
        if (!startsAt.isAfter(now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A reunião deve ser marcada para o futuro");
        }
        Instant endsAt = startsAt.plus(Duration.ofMinutes(request.durationMinutes()));

        ensureNoConflict(me.getId(), other.getId(), startsAt, endsAt, NO_EXCLUSION);

        Meeting meeting = meetingRepository.save(Meeting.builder()
                .organizer(me)
                .invitee(other)
                .title(request.title().strip())
                .agenda(blankToNull(request.agenda()))
                .startsAt(startsAt)
                .endsAt(endsAt)
                .meetingUrl(blankToNull(request.meetingUrl()))
                .status(MeetingStatus.PENDENTE)
                .build());

        return toResponse(meeting, me.getId());
    }

    @Transactional(readOnly = true)
    public List<MeetingResponse> listMine(AuthUser authUser, MeetingStatus status) {
        User me = participantService.requireCommunicatingUser(authUser);
        return meetingRepository.findAllByParticipant(me.getId()).stream()
                .filter(meeting -> status == null || meeting.getStatus() == status)
                .map(meeting -> toResponse(meeting, me.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public MeetingResponse get(AuthUser authUser, Long meetingId) {
        return toResponse(requireParticipantMeeting(authUser, meetingId), authUser.getId());
    }

    /** Só o convidado aceita; a agenda dos dois é checada de novo no momento do aceite. */
    @Transactional
    public MeetingResponse accept(AuthUser authUser, Long meetingId) {
        Meeting meeting = requireParticipantMeeting(authUser, meetingId);
        requireInvitee(meeting, authUser.getId());
        requireStatus(meeting, MeetingStatus.PENDENTE);

        if (!meeting.getStartsAt().isAfter(now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O horário da reunião já passou");
        }
        ensureNoConflict(meeting.getOrganizer().getId(), meeting.getInvitee().getId(),
                meeting.getStartsAt(), meeting.getEndsAt(), meeting.getId());

        meeting.setStatus(MeetingStatus.CONFIRMADA);
        return toResponse(meetingRepository.save(meeting), authUser.getId());
    }

    @Transactional
    public MeetingResponse decline(AuthUser authUser, Long meetingId) {
        Meeting meeting = requireParticipantMeeting(authUser, meetingId);
        requireInvitee(meeting, authUser.getId());
        requireStatus(meeting, MeetingStatus.PENDENTE);

        meeting.setStatus(MeetingStatus.RECUSADA);
        return toResponse(meetingRepository.save(meeting), authUser.getId());
    }

    /** Qualquer participante cancela uma reunião pendente ou confirmada. */
    @Transactional
    public MeetingResponse cancel(AuthUser authUser, Long meetingId, String reason) {
        Meeting meeting = requireParticipantMeeting(authUser, meetingId);
        if (!meeting.getStatus().blocksSchedule()) {
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

    private void ensureNoConflict(Long userA, Long userB, Instant startsAt, Instant endsAt, Long excludeId) {
        long overlapping = meetingRepository.countOverlapping(
                List.of(userA, userB), startsAt, endsAt, ACTIVE_STATUSES, excludeId);
        if (overlapping > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Já existe uma reunião pendente ou confirmada nesse horário para um dos participantes");
        }
    }

    private static void requireInvitee(Meeting meeting, Long userId) {
        if (!meeting.isInvitee(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o convidado pode responder ao convite");
        }
    }

    private static void requireStatus(Meeting meeting, MeetingStatus expected) {
        if (meeting.getStatus() != expected) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Operação inválida para reunião com status " + meeting.getStatus());
        }
    }

    private MeetingResponse toResponse(Meeting meeting, Long currentUserId) {
        int durationMinutes = (int) Duration.between(meeting.getStartsAt(), meeting.getEndsAt()).toMinutes();
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
                meeting.getUpdatedAt());
    }

    private Instant now() {
        return Instant.now(clock);
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String stripped = value.strip();
        return stripped.isEmpty() ? null : stripped;
    }
}

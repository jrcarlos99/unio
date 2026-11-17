package br.com.unio.matchmaking_backend.profile.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.repository.MessageRepository;
import br.com.unio.matchmaking_backend.profile.dto.DashboardStartupResponse;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import java.util.EnumSet;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DashboardStartupService {

    private static final EnumSet<MeetingStatus> SCHEDULED_STATUSES =
            EnumSet.of(MeetingStatus.PENDENTE, MeetingStatus.CONFIRMADA);

    private final MatchScoreRepository matchScoreRepository;
    private final MeetingRepository meetingRepository;
    private final MessageRepository messageRepository;

    @Transactional(readOnly = true)
    public DashboardStartupResponse getDashboard(AuthUser authUser) {
        requireStartup(authUser);

        Long userId = authUser.getId();
        UUID startupId = new UUID(0L, userId);

        return new DashboardStartupResponse(
                null,
                matchScoreRepository.countByStartupId(startupId),
                meetingRepository.countByParticipantAndStatusIn(userId, SCHEDULED_STATUSES),
                messageRepository.countUnreadByParticipant(userId));
    }

    private void requireStartup(AuthUser authUser) {
        if (authUser == null || authUser.getRole() != Role.STARTUP) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Usuário não é do tipo STARTUP");
        }
    }
}

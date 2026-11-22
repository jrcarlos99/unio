package br.com.unio.matchmaking_backend.profile.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.repository.MessageRepository;
import br.com.unio.matchmaking_backend.match.repository.MatchInterestRepository;
import br.com.unio.matchmaking_backend.popularity.service.PopularityService;
import br.com.unio.matchmaking_backend.profile.dto.DashboardStartupResponse;
import java.util.EnumSet;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * T21 (main): números do painel da startup. D060: cada número vem da fonte única do conceito,
 * em vez de uma conta própria.
 * <ul>
 *   <li>totalVisualizacoes: visitas ao perfil nos últimos 28 dias (PopularityService, D041).
 *       Antes era sempre null.</li>
 *   <li>totalMatches: matches mútuos em match_interests (D049/D060). Antes contava as linhas de
 *       match_scores, que são pares com score calculado, não matches.</li>
 *   <li>totalReunioesAgendadas e totalMensagensNaoLidas: sem mudança.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class DashboardStartupService {

    private static final EnumSet<MeetingStatus> SCHEDULED_STATUSES =
            EnumSet.of(MeetingStatus.PENDENTE, MeetingStatus.CONFIRMADA);

    private final MatchInterestRepository matchInterestRepository;
    private final MeetingRepository meetingRepository;
    private final MessageRepository messageRepository;
    private final PopularityService popularityService;

    @Transactional(readOnly = true)
    public DashboardStartupResponse getDashboard(AuthUser authUser) {
        requireStartup(authUser);

        Long userId = authUser.getId();

        return new DashboardStartupResponse(
                popularityService.viewsLast28Days(userId),
                matchInterestRepository.countMutualMatchesOf(userId),
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

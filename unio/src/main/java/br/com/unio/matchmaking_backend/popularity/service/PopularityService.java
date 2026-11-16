package br.com.unio.matchmaking_backend.popularity.service;

import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.popularity.dto.PopularityResponse;
import br.com.unio.matchmaking_backend.popularity.dto.WeeklyViewsDto;
import br.com.unio.matchmaking_backend.popularity.repository.ProfileViewRepository;
import br.com.unio.matchmaking_backend.review.dto.ReviewSummaryResponse;
import br.com.unio.matchmaking_backend.review.service.ReviewService;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * RF10: popularidade e visitas ao perfil.
 * <ul>
 *   <li>D041: {@link #registerView} conta no máximo uma visita por visitante, por perfil, por dia;
 *       ignora auto-visita e visitante do mesmo papel do alvo. O visitante nunca sai na API.</li>
 *   <li>D042: {@link #myPopularity} junta o resumo das avaliações (D040), as reuniões realizadas e as
 *       visitas em janelas de 28 dias e de 7 dias.</li>
 * </ul>
 * Os dias seguem o fuso America/Recife, o mesmo das telas.
 */
@Service
public class PopularityService {

    static final ZoneId ZONE = ZoneId.of("America/Recife");
    static final int WINDOW_DAYS = 28;
    static final int WEEKS = 4;

    private final ProfileViewRepository profileViewRepository;
    private final MeetingRepository meetingRepository;
    private final ParticipantService participantService;
    private final ReviewService reviewService;
    private final Clock clock;

    @Autowired
    public PopularityService(ProfileViewRepository profileViewRepository,
                             MeetingRepository meetingRepository,
                             ParticipantService participantService,
                             ReviewService reviewService) {
        this(profileViewRepository, meetingRepository, participantService, reviewService, Clock.system(ZONE));
    }

    /** Construtor com relógio controlável, usado nos testes. */
    public PopularityService(ProfileViewRepository profileViewRepository,
                             MeetingRepository meetingRepository,
                             ParticipantService participantService,
                             ReviewService reviewService,
                             Clock clock) {
        this.profileViewRepository = profileViewRepository;
        this.meetingRepository = meetingRepository;
        this.participantService = participantService;
        this.reviewService = reviewService;
        this.clock = clock;
    }

    /**
     * D041: registra a visita de quem está logado ao perfil {@code targetUserId}. Alvo inexistente
     * ou removido responde 404; auto-visita e visitante do mesmo papel do alvo são ignorados.
     *
     * @return true quando uma visita nova foi contada
     */
    @Transactional
    public boolean registerView(AuthUser authUser, Long targetUserId) {
        User viewer = participantService.requireCommunicatingUser(authUser);
        if (Objects.equals(viewer.getId(), targetUserId)) {
            return false;
        }
        User target = targetUserId == null ? null : participantService.findUser(targetUserId);
        if (target == null || !participantService.isActive(target)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil não encontrado");
        }
        if (!ParticipantService.complementary(viewer, target)) {
            return false;
        }
        return profileViewRepository.insertIfAbsent(target.getId(), viewer.getId(), today()) > 0;
    }

    /** D042: popularidade do próprio usuário (só agregados). */
    @Transactional(readOnly = true)
    public PopularityResponse myPopularity(AuthUser authUser) {
        User me = participantService.requireCommunicatingUser(authUser);
        Long userId = me.getId();
        ReviewSummaryResponse summary = reviewService.summaryOf(userId);

        LocalDate today = today();
        LocalDate windowStart = today.minusDays(WINDOW_DAYS - 1L);
        long views28d = profileViewRepository.countReceivedBetween(userId, windowStart, today);
        long viewsPrev28d = profileViewRepository.countReceivedBetween(
                userId, windowStart.minusDays(WINDOW_DAYS), windowStart.minusDays(1));

        List<WeeklyViewsDto> weekly = new ArrayList<>(WEEKS);
        for (int week = 0; week < WEEKS; week++) {
            LocalDate start = windowStart.plusDays(7L * week);
            long views = profileViewRepository.countReceivedBetween(userId, start, start.plusDays(6));
            weekly.add(new WeeklyViewsDto(start, views));
        }

        return new PopularityResponse(
                userId,
                summary.totalReviews(),
                summary.averageRating(),
                summary.percentage(),
                summary.visible(),
                meetingRepository.countByParticipantAndStatus(userId, MeetingStatus.REALIZADA),
                views28d,
                viewsPrev28d,
                weekly,
                // O interesse mútuo ainda não existe no back (D039): fica 0 até existir
                0L);
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(ZONE));
    }
}

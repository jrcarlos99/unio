package br.com.unio.matchmaking_backend.review.service;

import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.service.MeetingService;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.review.dto.ReceivedReviewsResponse;
import br.com.unio.matchmaking_backend.review.dto.ReviewCreateRequest;
import br.com.unio.matchmaking_backend.review.dto.ReviewResponse;
import br.com.unio.matchmaking_backend.review.dto.ReviewSummaryResponse;
import br.com.unio.matchmaking_backend.review.entity.InteractionReview;
import br.com.unio.matchmaking_backend.review.repository.InteractionReviewRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * T12 (RF10): avaliação pós-interação, liberada quando a reunião (T09b) é REALIZADA.
 *
 * <ul>
 *   <li>D040: resumo público só com agregados e mínimo de {@link #MIN_REVIEWS_VISIBLE} avaliações.</li>
 *   <li>D043: o comentário é opcional, fica gravado e não sai em nenhuma resposta destas rotas.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class ReviewService {

    /** Abaixo disto, média e porcentagem do resumo são nulas (D040). Igual ao front (ADR-006). */
    public static final int MIN_REVIEWS_VISIBLE = 3;

    private final InteractionReviewRepository reviewRepository;
    private final MeetingService meetingService;
    private final ParticipantService participantService;

    @Transactional
    public ReviewResponse create(AuthUser authUser, Long meetingId, ReviewCreateRequest request) {
        Meeting meeting = meetingService.requireParticipantMeeting(authUser, meetingId);

        if (meeting.getStatus() != MeetingStatus.REALIZADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A avaliação fica disponível depois que a reunião for marcada como realizada");
        }
        if (reviewRepository.existsByMeetingIdAndReviewerId(meetingId, authUser.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já avaliou esta reunião");
        }

        InteractionReview review = reviewRepository.save(InteractionReview.builder()
                .meeting(meeting)
                .reviewer(participantService.requireUser(authUser.getId()))
                .reviewed(meeting.otherParticipant(authUser.getId()))
                .rating(request.rating())
                .comment(blankToNull(request.comment()))
                .build());

        return toResponse(review);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> listForMeeting(AuthUser authUser, Long meetingId) {
        meetingService.requireParticipantMeeting(authUser, meetingId);
        return reviewRepository.findByMeetingIdOrderByCreatedAtAsc(meetingId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReceivedReviewsResponse received(AuthUser authUser) {
        participantService.requireCommunicatingUser(authUser);
        List<ReviewResponse> reviews = reviewRepository.findByReviewedIdOrderByCreatedAtDesc(authUser.getId())
                .stream()
                .map(this::toResponse)
                .toList();
        Double average = roundOneDecimal(reviewRepository.averageRatingFor(authUser.getId()));
        return new ReceivedReviewsResponse(average, reviews.size(), reviews);
    }

    /**
     * D040: resumo público de um usuário. Pode consultar o próprio resumo ou o de um usuário
     * ativo do papel complementar (startup consulta investidor e vice-versa). Qualquer outro
     * caso responde 404, sem dizer se o usuário existe.
     */
    @Transactional(readOnly = true)
    public ReviewSummaryResponse summary(AuthUser authUser, Long userId) {
        User me = participantService.requireCommunicatingUser(authUser);
        if (!Objects.equals(me.getId(), userId)) {
            User target = userId == null ? null : participantService.findUser(userId);
            if (target == null || !participantService.isActive(target) || !ParticipantService.complementary(me, target)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado");
            }
        }
        return summaryOf(userId);
    }

    /** Agregados das avaliações recebidas, sem checar quem consulta (uso interno). */
    @Transactional(readOnly = true)
    public ReviewSummaryResponse summaryOf(Long userId) {
        long total = reviewRepository.countByReviewedId(userId);
        boolean visible = total >= MIN_REVIEWS_VISIBLE;
        Double average = visible ? reviewRepository.averageRatingFor(userId) : null;
        return new ReviewSummaryResponse(
                userId,
                total,
                visible ? roundOneDecimal(average) : null,
                visible ? percentageOf(average) : null,
                visible);
    }

    /** round(média / 5 * 100), igual ao calcularPercentual do front. */
    public static Integer percentageOf(Double average) {
        if (average == null) {
            return null;
        }
        return (int) Math.round(average / 5.0 * 100.0);
    }

    public static Double roundOneDecimal(Double value) {
        if (value == null) {
            return null;
        }
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    /** D043: o comentário nunca entra na resposta, nem para o autor nem para o avaliado. */
    private ReviewResponse toResponse(InteractionReview review) {
        return new ReviewResponse(
                review.getId(),
                review.getMeeting().getId(),
                participantService.toDto(review.getReviewer()),
                participantService.toDto(review.getReviewed()),
                review.getRating(),
                review.getCreatedAt());
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String stripped = value.strip();
        return stripped.isEmpty() ? null : stripped;
    }
}

package br.com.unio.matchmaking_backend.review.service;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.service.MeetingService;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.review.dto.ReceivedReviewsResponse;
import br.com.unio.matchmaking_backend.review.dto.ReviewCreateRequest;
import br.com.unio.matchmaking_backend.review.dto.ReviewResponse;
import br.com.unio.matchmaking_backend.review.entity.InteractionReview;
import br.com.unio.matchmaking_backend.review.repository.InteractionReviewRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** T12 (RF10) — avaliação pós-interação, liberada quando a reunião (T09b) é REALIZADA. */
@Service
@RequiredArgsConstructor
public class ReviewService {

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

    public static Double roundOneDecimal(Double value) {
        if (value == null) {
            return null;
        }
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private ReviewResponse toResponse(InteractionReview review) {
        return new ReviewResponse(
                review.getId(),
                review.getMeeting().getId(),
                participantService.toDto(review.getReviewer()),
                participantService.toDto(review.getReviewed()),
                review.getRating(),
                review.getComment(),
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

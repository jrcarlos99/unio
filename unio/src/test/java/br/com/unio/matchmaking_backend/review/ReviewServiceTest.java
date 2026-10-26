package br.com.unio.matchmaking_backend.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.service.MeetingService;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.review.dto.ReceivedReviewsResponse;
import br.com.unio.matchmaking_backend.review.dto.ReviewCreateRequest;
import br.com.unio.matchmaking_backend.review.dto.ReviewResponse;
import br.com.unio.matchmaking_backend.review.entity.InteractionReview;
import br.com.unio.matchmaking_backend.review.repository.InteractionReviewRepository;
import br.com.unio.matchmaking_backend.review.service.ReviewService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ReviewServiceTest {

    private InteractionReviewRepository reviewRepository;
    private MeetingService meetingService;
    private ReviewService service;
    private User startup;
    private User investor;

    @BeforeEach
    void setUp() {
        reviewRepository = mock(InteractionReviewRepository.class);
        meetingService = mock(MeetingService.class);
        UserRepository userRepository = mock(UserRepository.class);
        StartupRepository startupRepository = mock(StartupRepository.class);
        ParticipantService participantService = new ParticipantService(userRepository, startupRepository);
        service = new ReviewService(reviewRepository, meetingService, participantService);

        startup = User.builder().id(1L).role(Role.STARTUP).email("startup@unio.com").passwordHash("x").build();
        investor = User.builder().id(2L).role(Role.INVESTOR).email("anjo@unio.com").passwordHash("x").build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(startup));
        when(userRepository.findById(2L)).thenReturn(Optional.of(investor));
        when(startupRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(reviewRepository.save(any(InteractionReview.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void avaliaOOutroParticipanteDeReuniaoRealizada() {
        Meeting meeting = meeting(MeetingStatus.REALIZADA);
        when(meetingService.requireParticipantMeeting(any(), any())).thenReturn(meeting);
        when(reviewRepository.existsByMeetingIdAndReviewerId(5L, 1L)).thenReturn(false);

        ReviewResponse response = service.create(new AuthUser(startup), 5L, new ReviewCreateRequest(5, "  Ótima conversa  "));

        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.comment()).isEqualTo("Ótima conversa");
        assertThat(response.reviewed().id()).isEqualTo(2L);
        assertThat(response.reviewer().id()).isEqualTo(1L);
    }

    @Test
    void reuniaoAindaNaoRealizadaNaoPodeSerAvaliada() {
        when(meetingService.requireParticipantMeeting(any(), any())).thenReturn(meeting(MeetingStatus.CONFIRMADA));

        assertThatThrownBy(() -> service.create(new AuthUser(startup), 5L, new ReviewCreateRequest(4, null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
        verify(reviewRepository, never()).save(any());
    }

    @Test
    void segundaAvaliacaoDoMesmoParticipanteEhRecusada() {
        when(meetingService.requireParticipantMeeting(any(), any())).thenReturn(meeting(MeetingStatus.REALIZADA));
        when(reviewRepository.existsByMeetingIdAndReviewerId(5L, 1L)).thenReturn(true);

        assertThatThrownBy(() -> service.create(new AuthUser(startup), 5L, new ReviewCreateRequest(3, null)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void recebidasTrazMediaArredondada() {
        InteractionReview review = InteractionReview.builder()
                .id(1L).meeting(meeting(MeetingStatus.REALIZADA)).reviewer(investor).reviewed(startup)
                .rating(4).createdAt(Instant.now()).build();
        when(reviewRepository.findByReviewedIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(review));
        when(reviewRepository.averageRatingFor(1L)).thenReturn(4.333333);

        ReceivedReviewsResponse response = service.received(new AuthUser(startup));

        assertThat(response.totalReviews()).isEqualTo(1);
        assertThat(response.averageRating()).isEqualTo(4.3);
    }

    @Test
    void semAvaliacoesAMediaEhNula() {
        when(reviewRepository.findByReviewedIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());
        when(reviewRepository.averageRatingFor(1L)).thenReturn(null);

        assertThat(service.received(new AuthUser(startup)).averageRating()).isNull();
    }

    private Meeting meeting(MeetingStatus status) {
        Instant start = Instant.parse("2026-11-01T14:00:00Z");
        return Meeting.builder()
                .id(5L).organizer(investor).invitee(startup).title("Conversa")
                .startsAt(start).endsAt(start.plusSeconds(1800)).status(status)
                .createdAt(start).updatedAt(start)
                .build();
    }
}

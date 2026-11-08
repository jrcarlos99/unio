package br.com.unio.matchmaking_backend.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.admin.dto.AdminMetricsResponse;
import br.com.unio.matchmaking_backend.admin.service.AdminMetricsService;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.ConversationRepository;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.repository.MessageRepository;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.review.repository.InteractionReviewRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
import br.com.unio.matchmaking_backend.scorecard.feedback.FeedbackEventRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdminMetricsServiceTest {

    @Test
    void consolidaMetricasDeMatchingComunicacaoEAvaliacao() {
        StartupRepository startups = mock(StartupRepository.class);
        InvestorRepository investors = mock(InvestorRepository.class);
        MatchScoreRepository scores = mock(MatchScoreRepository.class);
        FeedbackEventRepository feedbacks = mock(FeedbackEventRepository.class);
        ConversationRepository conversations = mock(ConversationRepository.class);
        MessageRepository messages = mock(MessageRepository.class);
        MeetingRepository meetings = mock(MeetingRepository.class);
        InteractionReviewRepository reviews = mock(InteractionReviewRepository.class);

        MatchScoreClassification anyClassification = MatchScoreClassification.values()[0];
        when(startups.count()).thenReturn(4L);
        when(investors.count()).thenReturn(3L);
        when(scores.count()).thenReturn(12L);
        when(scores.countByClassification()).thenReturn(List.<Object[]>of(new Object[] {anyClassification, 12L}));
        when(conversations.count()).thenReturn(5L);
        when(messages.count()).thenReturn(40L);
        when(meetings.count()).thenReturn(6L);
        when(meetings.countByStatus(any())).thenReturn(0L);
        when(meetings.countByStatus(MeetingStatus.REALIZADA)).thenReturn(2L);
        when(reviews.count()).thenReturn(3L);
        when(reviews.averageRating()).thenReturn(4.6666);

        AdminMetricsResponse metrics = new AdminMetricsService(startups, investors, scores, feedbacks,
                conversations, messages, meetings, reviews).getMetrics();

        assertThat(metrics.getTotalStartups()).isEqualTo(4);
        assertThat(metrics.getDistributionByClassification()).containsEntry(anyClassification.name(), 12L);
        assertThat(metrics.getTotalConversations()).isEqualTo(5);
        assertThat(metrics.getTotalMessages()).isEqualTo(40);
        assertThat(metrics.getMeetingsByStatus()).hasSize(MeetingStatus.values().length)
                .containsEntry("REALIZADA", 2L)
                .containsEntry("PENDENTE", 0L);
        assertThat(metrics.getAverageRating()).isEqualTo(4.7);
    }
}

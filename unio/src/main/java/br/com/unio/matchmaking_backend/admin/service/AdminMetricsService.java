package br.com.unio.matchmaking_backend.admin.service;

import br.com.unio.matchmaking_backend.admin.dto.AdminMetricsResponse;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.ConversationRepository;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.repository.MessageRepository;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.review.repository.InteractionReviewRepository;
import br.com.unio.matchmaking_backend.review.service.ReviewService;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.feedback.FeedbackEventRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminMetricsService {

    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final MatchScoreRepository matchScoreRepository;
    private final FeedbackEventRepository feedbackEventRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MeetingRepository meetingRepository;
    private final InteractionReviewRepository reviewRepository;

    @Transactional(readOnly = true)
    public AdminMetricsResponse getMetrics() {
        return AdminMetricsResponse.builder()
            .totalStartups(startupRepository.count())
            .totalInvestors(investorRepository.count())
            .totalMatches(matchScoreRepository.count())
            .totalFeedbacks(feedbackEventRepository.count())
            .distributionByClassification(distributionByClassification())
            .totalConversations(conversationRepository.count())
            .totalMessages(messageRepository.count())
            .totalMeetings(meetingRepository.count())
            .meetingsByStatus(meetingsByStatus())
            .totalReviews(reviewRepository.count())
            .averageRating(ReviewService.roundOneDecimal(reviewRepository.averageRating()))
            .build();
    }

    /** Agrupado no banco (GROUP BY) em vez de carregar todos os scores na memória. */
    private Map<String, Long> distributionByClassification() {
        Map<String, Long> distribution = new LinkedHashMap<>();
        for (Object[] row : matchScoreRepository.countByClassification()) {
            distribution.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        return distribution;
    }

    /** Todos os status aparecem, mesmo com zero, para o painel não precisar tratar ausência. */
    private Map<String, Long> meetingsByStatus() {
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (MeetingStatus status : MeetingStatus.values()) {
            byStatus.put(status.name(), meetingRepository.countByStatus(status));
        }
        return byStatus;
    }
}

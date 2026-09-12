package br.com.unio.matchmaking_backend.scorecard.feedback;

import br.com.unio.matchmaking_backend.scorecard.common.FeedbackAction;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "feedback_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "investor_id", nullable = false)
    private UUID investorId;

    @Column(name = "startup_id", nullable = false)
    private UUID startupId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "score_policy_id", nullable = false)
    private ScorePolicy scorePolicy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FeedbackAction action;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

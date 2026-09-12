package br.com.unio.matchmaking_backend.scorecard.calculation;

import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
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
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "match_scores",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_match_score_investor_startup_policy",
        columnNames = {"investor_id", "startup_id", "score_policy_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchScore {

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

    @Column(name = "total_score", nullable = false, precision = 10, scale = 4)
    private BigDecimal totalScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private MatchScoreClassification classification;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;
}

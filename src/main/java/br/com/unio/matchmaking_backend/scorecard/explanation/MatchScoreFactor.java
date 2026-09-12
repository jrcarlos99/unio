package br.com.unio.matchmaking_backend.scorecard.explanation;

import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreFactorType;
import br.com.unio.matchmaking_backend.scorecard.common.ScoreDimension;
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
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "match_score_factors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchScoreFactor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_score_id", nullable = false)
    private MatchScore matchScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ScoreDimension dimension;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MatchScoreFactorType type;

    @Column(nullable = false)
    private Integer rank;

    @Column(name = "factor_code", nullable = false, length = 100)
    private String factorCode;

    @Column(name = "factor_label", nullable = false, length = 255)
    private String factorLabel;

    @Column(name = "factor_score", nullable = false, precision = 10, scale = 4)
    private BigDecimal factorScore;

    @Column(name = "weight_applied", nullable = false, precision = 10, scale = 4)
    private BigDecimal weightApplied;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String explanation;
}

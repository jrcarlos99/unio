package br.com.unio.matchmaking_backend.scorecard.policy;

import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "score_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScorePolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "investor_profile_type", nullable = false, length = 50)
    private InvestorProfileType investorProfileType;

    @Column(nullable = false)
    private Integer version;

    @Column(nullable = false)
    private boolean active;

    @Column(length = 255)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Builder.Default
    @OneToMany(mappedBy = "scorePolicy", fetch = FetchType.LAZY)
    private List<ScoreCriterion> criteria = new java.util.ArrayList<>();

}

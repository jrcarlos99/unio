package br.com.unio.matchmaking_backend.scorecard.policy.dto;

import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScorePolicyResponse {

    private Long id;
    private InvestorProfileType investorProfileType;
    private Integer version;
    private boolean active;
    private String name;
    private Instant createdAt;
}

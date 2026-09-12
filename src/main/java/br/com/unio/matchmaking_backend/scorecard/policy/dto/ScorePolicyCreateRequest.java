package br.com.unio.matchmaking_backend.scorecard.policy.dto;

import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class ScorePolicyCreateRequest {

    @NotNull(message = "Investor profile type is required")
    private InvestorProfileType investorProfileType;

    @NotNull(message = "Version is required")
    private Integer version;

    @NotNull(message = "Active is required")
    private Boolean active;

    @NotBlank(message = "Name is required")
    private String name;
}

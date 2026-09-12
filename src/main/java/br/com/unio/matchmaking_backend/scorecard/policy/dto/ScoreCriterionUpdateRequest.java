package br.com.unio.matchmaking_backend.scorecard.policy.dto;

import br.com.unio.matchmaking_backend.scorecard.common.CriticalityLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
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
public class ScoreCriterionUpdateRequest {

    @NotBlank(message = "Label is required")
    @Size(max = 255, message = "Label must be at most 255 characters")
    private String label;

    @NotNull(message = "Weight is required")
    @Positive(message = "Weight must be positive")
    private BigDecimal weight;

    @NotNull(message = "Criticality is required")
    private CriticalityLevel criticality;

    @NotNull(message = "Active is required")
    private Boolean active;
}
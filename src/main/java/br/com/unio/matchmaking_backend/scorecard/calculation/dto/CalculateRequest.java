package br.com.unio.matchmaking_backend.scorecard.calculation.dto;

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
public class CalculateRequest {

    @NotNull(message = "startupId é obrigatório")
    private Long startupId;

    @NotNull(message = "investorId é obrigatório")
    private Long investorId;
}
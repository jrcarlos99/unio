package br.com.unio.matchmaking_backend.scorecard.feedback.dto;

import br.com.unio.matchmaking_backend.scorecard.common.FeedbackAction;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
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
public class FeedbackCreateRequest {

    @NotNull(message = "startupId é obrigatório")
    private UUID startupId;

    @NotNull(message = "investorId é obrigatório")
    private UUID investorId;

    @NotNull(message = "scorePolicyId é obrigatório")
    private Long scorePolicyId;

    @NotNull(message = "action é obrigatória")
    private FeedbackAction action;
}
package br.com.unio.matchmaking_backend.matching.dto;

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
public class SwipeRequest {

    @NotNull(message = "Target user id é obrigatório")
    private Long targetUserId;

    @NotBlank(message = "Ação é obrigatória")
    private String action;
}

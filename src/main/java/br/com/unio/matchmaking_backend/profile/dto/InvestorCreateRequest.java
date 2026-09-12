package br.com.unio.matchmaking_backend.profile.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;
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
public class InvestorCreateRequest {

    private List<String> segmentosInteresse;

    private List<String> estagiosInteresse;

    @NotNull(message = "Ticket mínimo é obrigatório")
    @Positive(message = "Ticket mínimo deve ser positivo")
    private BigDecimal ticketMinimo;

    @NotNull(message = "Ticket máximo é obrigatório")
    @Positive(message = "Ticket máximo deve ser positivo")
    private BigDecimal ticketMaximo;

    private String regiaoInteresse;

    private String perfilRisco;
}
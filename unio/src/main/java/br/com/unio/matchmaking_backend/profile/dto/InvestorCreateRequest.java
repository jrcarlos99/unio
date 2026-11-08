package br.com.unio.matchmaking_backend.profile.dto;

import br.com.unio.matchmaking_backend.profile.entity.DisponibilidadeMentoria;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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

    // Tickets opcionais (D029): quem atua só como mentor não informa. @Positive só
    // valida quando o valor vem preenchido.
    @Positive(message = "Ticket mínimo deve ser positivo")
    private BigDecimal ticketMinimo;

    @Positive(message = "Ticket máximo deve ser positivo")
    private BigDecimal ticketMaximo;

    private String regiaoInteresse;

    private String perfilRisco;

    private DisponibilidadeMentoria disponibilidade;

    @Size(max = 255)
    private String disponibilidadeObservacao;
}
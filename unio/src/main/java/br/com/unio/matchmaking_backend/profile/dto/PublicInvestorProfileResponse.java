package br.com.unio.matchmaking_backend.profile.dto;

import br.com.unio.matchmaking_backend.profile.entity.DisponibilidadeMentoria;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicInvestorProfileResponse {

    private Long id;
    private String email;
    private Instant createdAt;
    private List<String> segmentosInteresse;
    private List<String> estagiosInteresse;
    private BigDecimal ticketMinimo;
    private BigDecimal ticketMaximo;
    private String regiaoInteresse;
    private String perfilRisco;
    private DisponibilidadeMentoria disponibilidade;
    private String disponibilidadeObservacao;
}

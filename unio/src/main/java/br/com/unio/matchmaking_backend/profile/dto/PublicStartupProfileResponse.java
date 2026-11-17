package br.com.unio.matchmaking_backend.profile.dto;

import br.com.unio.matchmaking_backend.profile.entity.DisponibilidadeMentoria;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicStartupProfileResponse {

    private Long id;
    private String email;
    private Instant createdAt;
    private String nome;
    private String segmento;
    private String estagio;
    private String localizacao;
    private String modeloNegocio;
    private String mercadoAlvo;
    private BigDecimal capitalProcurado;
    private String pitchCanvas;
    private String pitchFileUrl;
    private DisponibilidadeMentoria disponibilidade;
    private String disponibilidadeObservacao;
}

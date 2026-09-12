package br.com.unio.matchmaking_backend.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class StartupCreateRequest {

    @NotBlank(message = "Segmento é obrigatório")
    private String segmento;

    @NotBlank(message = "Estágio é obrigatório")
    private String estagio;

    @NotBlank(message = "Localização é obrigatória")
    private String localizacao;

    @NotBlank(message = "Modelo de negócio é obrigatório")
    private String modeloNegocio;

    @NotBlank(message = "Mercado alvo é obrigatório")
    private String mercadoAlvo;

    @NotNull(message = "Capital procurado é obrigatório")
    @Positive(message = "Capital procurado deve ser positivo")
    private BigDecimal capitalProcurado;

    private String pitchCanvas;
}
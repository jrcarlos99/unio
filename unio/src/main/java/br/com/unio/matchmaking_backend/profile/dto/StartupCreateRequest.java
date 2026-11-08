package br.com.unio.matchmaking_backend.profile.dto;

import br.com.unio.matchmaking_backend.profile.entity.DisponibilidadeMentoria;
import jakarta.validation.constraints.NotBlank;
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
public class StartupCreateRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 255, message = "Nome deve ter no máximo 255 caracteres")
    private String nome;

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

    // Opcional (D029): startup que não busca investimento não informa. @Positive só
    // valida quando o valor vem preenchido.
    @Positive(message = "Capital procurado deve ser positivo")
    private BigDecimal capitalProcurado;

    private String pitchCanvas;

    private DisponibilidadeMentoria disponibilidade;

    @Size(max = 255, message = "disponibilidadeObservacao deve ter no máximo 255 caracteres")
    private String disponibilidadeObservacao;
}
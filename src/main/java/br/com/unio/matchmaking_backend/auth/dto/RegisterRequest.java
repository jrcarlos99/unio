package br.com.unio.matchmaking_backend.auth.dto;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class RegisterRequest {

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 8, message = "Senha deve ter no mínimo 8 caracteres")
    private String password;

    @NotNull(message = "Tipo de perfil é obrigatório")
    private Role role;

    private String segmento;
    private String estagio;
    private String localizacao;
    private String modeloNegocio;
    private String mercadoAlvo;
    private BigDecimal capitalProcurado;
    private String pitchCanvas;

    private List<String> segmentosInteresse;
    private List<String> estagiosInteresse;
    private BigDecimal ticketMinimo;
    private BigDecimal ticketMaximo;
    private String regiaoInteresse;
    private String perfilRisco;
}

package br.com.unio.matchmaking_backend.profile.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * D054: corpo de POST /api/admin/bootstrap-admin. Antes e-mail e senha iam na query
 * string, que fica em logs de acesso, histórico do navegador e proxies.
 */
@Schema(description = "Novo administrador (somente um ADMIN logado cria outro)")
public record BootstrapAdminRequest(
        @NotBlank(message = "Email é obrigatório")
        @Email(message = "Email inválido")
        @Schema(example = "admin@exemplo.com.br")
        String email,
        @NotBlank(message = "Senha é obrigatória")
        @Size(min = 8, message = "A senha deve ter pelo menos 8 caracteres")
        @Schema(description = "Mínimo de 8 caracteres")
        String password
) {
    @Override
    public String toString() {
        // Nunca expor a senha em log ou mensagem de erro
        return "BootstrapAdminRequest[email=" + email + "]";
    }
}

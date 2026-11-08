package br.com.unio.matchmaking_backend.privacy.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Confirmação da exclusão de conta.
 *
 * @param password  senha atual do titular
 * @param confirmed precisa ser true — o front mostra o aviso de que a ação é irreversível
 */
public record AccountDeletionRequest(
        @NotBlank(message = "Informe sua senha para confirmar")
        String password,

        @NotNull(message = "Confirme que entende que a exclusão é irreversível")
        @AssertTrue(message = "Confirme que entende que a exclusão é irreversível")
        Boolean confirmed
) {
}

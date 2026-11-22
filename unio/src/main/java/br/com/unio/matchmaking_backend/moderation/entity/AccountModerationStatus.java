package br.com.unio.matchmaking_backend.moderation.entity;

/**
 * D063 (RF08): situação de moderação de uma conta. Conta sem registro em
 * {@code account_moderation} vale como {@link #APROVADO}.
 */
public enum AccountModerationStatus {
    APROVADO,
    PENDENTE,
    RECUSADO,
    SUSPENSO;

    /** RECUSADO e SUSPENSO não entram (login 403). */
    public boolean blocksLogin() {
        return this == RECUSADO || this == SUSPENSO;
    }

    /** Fora da descoberta, dos perfis públicos e das contrapartes: tudo que não é APROVADO. */
    public boolean hidesAccount() {
        return this != APROVADO;
    }
}

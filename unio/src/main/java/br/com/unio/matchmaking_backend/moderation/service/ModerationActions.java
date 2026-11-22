package br.com.unio.matchmaking_backend.moderation.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * D063 (RNF10): códigos das ações de moderação gravadas em {@code audit_logs.action} e a regra
 * do motivo. O front traduz cada código para um texto em português no log de auditoria.
 */
public final class ModerationActions {

    public static final String ACCOUNT_APPROVED = "MODERACAO_CONTA_APROVADA";
    public static final String ACCOUNT_REJECTED = "MODERACAO_CONTA_RECUSADA";
    public static final String ACCOUNT_SUSPENDED = "MODERACAO_CONTA_SUSPENSA";
    public static final String ACCOUNT_REACTIVATED = "MODERACAO_CONTA_REATIVADA";
    public static final String PITCH_APPROVED = "MODERACAO_PITCH_APROVADO";
    public static final String PITCH_REMOVED = "MODERACAO_PITCH_REMOVIDO";

    public static final String ENTITY_USER = "User";
    public static final String ENTITY_PITCH = "StartupPitchPublication";

    public static final int REASON_MIN = 3;
    public static final int REASON_MAX = 255;
    public static final String REASON_MESSAGE = "Informe o motivo, com 3 a 255 caracteres";

    private ModerationActions() {
    }

    /** Motivo obrigatório de recusa, suspensão e remoção: de 3 a 255 caracteres, sem espaços nas pontas. */
    public static String requireReason(String reason) {
        String value = reason == null ? "" : reason.strip();
        if (value.length() < REASON_MIN || value.length() > REASON_MAX) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, REASON_MESSAGE);
        }
        return value;
    }
}

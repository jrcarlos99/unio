package br.com.unio.matchmaking_backend.communication.entity;

/**
 * Ciclo de vida de uma reunião (T09b).
 *
 * <pre>
 * PENDENTE ──aceitar──▶ CONFIRMADA ──concluir──▶ REALIZADA
 *    │                      │
 *    ├──recusar──▶ RECUSADA │
 *    └──cancelar──▶ CANCELADA ◀──cancelar
 * </pre>
 */
public enum MeetingStatus {
    PENDENTE,
    CONFIRMADA,
    RECUSADA,
    CANCELADA,
    REALIZADA;

    /** Status que ocupam a agenda dos participantes (usados no teste de conflito). */
    public boolean blocksSchedule() {
        return this == PENDENTE || this == CONFIRMADA;
    }
}

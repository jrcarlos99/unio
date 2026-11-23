package br.com.unio.matchmaking_backend.communication.entity;

/**
 * Ciclo de vida de uma reunião (T09b).
 *
 * <pre>
 * PENDENTE ──aceitar──▶ CONFIRMADA ──concluir──▶ REALIZADA
 *    │  ▲                   │
 *    │  └──contraproposta───┘ (remarcar, D033)
 *    ├──contraproposta──▶ PENDENTE (o outro lado passa a responder)
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

    /** Reunião em andamento: pode ser cancelada, remarcada ou ter link e local editados. */
    public boolean isActive() {
        return this == PENDENTE || this == CONFIRMADA;
    }

    /**
     * Status que ocupam a agenda no teste de conflito. Desde a D034 só a CONFIRMADA
     * bloqueia; a PENDENTE é só uma proposta e não reserva horário.
     */
    public boolean blocksSchedule() {
        return this == CONFIRMADA;
    }
}

package br.com.unio.matchmaking_backend.interest.dto;

/** D049: estado do interesse entre o usuário logado e outro usuário. */
public enum InterestStatus {
    /** Ninguém demonstrou interesse. */
    NONE,
    /** Eu demonstrei interesse; o outro lado ainda não. */
    SENT,
    /** O outro lado demonstrou interesse em mim; eu ainda não. */
    RECEIVED,
    /** Os dois demonstraram interesse (match mútuo). */
    MATCH
}

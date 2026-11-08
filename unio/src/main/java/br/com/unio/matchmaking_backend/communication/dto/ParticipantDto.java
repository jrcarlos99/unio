package br.com.unio.matchmaking_backend.communication.dto;

/** Resumo público do outro participante (sem e-mail nem documento). */
public record ParticipantDto(Long id, String name, String role, boolean active) {
}

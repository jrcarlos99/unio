package br.com.unio.matchmaking_backend.moderation.dto;

import java.util.List;

/** D063: página das listas de moderação ({@code total} é o total depois dos filtros). */
public record ModerationPage<T>(int total, int limit, int offset, List<T> items) {
}

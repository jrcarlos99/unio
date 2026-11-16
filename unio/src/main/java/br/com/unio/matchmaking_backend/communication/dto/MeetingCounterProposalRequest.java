package br.com.unio.matchmaking_backend.communication.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** Contraproposta ou remarcação (D033): novos horários que o outro lado vai responder. */
@Schema(description = "Novos horários sugeridos (contraproposta na PENDENTE, remarcação na CONFIRMADA)")
public record MeetingCounterProposalRequest(
        @ArraySchema(arraySchema = @Schema(description = "1 a 3 horários, no futuro e sem repetidos"),
                schema = @Schema(example = "2026-11-06T13:00:00Z"))
        @NotNull(message = "Informe de 1 a 3 horários sugeridos")
        @Size(min = 1, max = 3, message = "Informe de 1 a 3 horários sugeridos")
        List<@NotNull(message = "Horário sugerido inválido")
                @Future(message = "Os horários sugeridos devem estar no futuro") Instant> suggestedTimes,

        @Schema(description = "Mensagem nova (substitui a anterior quando informada)", nullable = true)
        @Size(max = 280, message = "A mensagem deve ter no máximo 280 caracteres")
        String message
) {
}

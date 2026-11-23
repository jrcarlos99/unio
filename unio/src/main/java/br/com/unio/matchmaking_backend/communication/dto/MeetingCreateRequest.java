package br.com.unio.matchmaking_backend.communication.dto;

import br.com.unio.matchmaking_backend.communication.entity.MeetingFormat;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/**
 * Proposta de reunião. Datas em ISO-8601 com fuso (ex.: 2026-11-03T14:00:00-03:00).
 *
 * <p>Compatível com o contrato da T09b (D038): um corpo só com {@code startsAt} vira
 * uma proposta de 1 horário. Com {@code suggestedTimes} (1 a 3), ele vale e o
 * {@code startsAt} é ignorado. {@code title} só é obrigatório sem {@code subject}.
 */
@Schema(description = "Proposta de reunião com 1 a 3 horários sugeridos (D032, D038)")
public record MeetingCreateRequest(
        @Schema(description = "Id do usuário do outro lado (startup ou investidor)", example = "12")
        @NotNull(message = "participantId é obrigatório")
        @Positive(message = "participantId inválido")
        Long participantId,

        @Schema(description = "Título. Opcional quando vier subject (o subject vira o título)",
                example = "Primeira conversa", nullable = true)
        @Size(max = 150, message = "O título deve ter no máximo 150 caracteres")
        String title,

        @Schema(description = "Pauta livre", nullable = true)
        @Size(max = 2000, message = "A pauta deve ter no máximo 2000 caracteres")
        String agenda,

        @Schema(description = "Contrato antigo: horário único. Ignorado quando vier suggestedTimes",
                example = "2026-11-05T14:00:00-03:00", nullable = true)
        @Future(message = "A reunião deve ser marcada para o futuro")
        Instant startsAt,

        @Schema(description = "Duração em minutos (15 a 240)", example = "45")
        @NotNull(message = "A duração é obrigatória")
        @Min(value = 15, message = "A duração mínima é de 15 minutos")
        @Max(value = 240, message = "A duração máxima é de 240 minutos")
        Integer durationMinutes,

        @Schema(description = "Link da sala, só https", example = "https://meet.google.com/abc-defg-hij",
                nullable = true)
        @Size(max = 500, message = "O link deve ter no máximo 500 caracteres")
        @Pattern(regexp = "^https://\\S+$", message = "O link da reunião deve começar com https://")
        String meetingUrl,

        @ArraySchema(arraySchema = @Schema(description = "1 a 3 horários sugeridos, todos no futuro e sem repetidos",
                nullable = true), schema = @Schema(example = "2026-11-05T14:00:00-03:00"))
        @Size(min = 1, max = 3, message = "Informe de 1 a 3 horários sugeridos")
        List<@NotNull(message = "Horário sugerido inválido")
                @Future(message = "Os horários sugeridos devem estar no futuro") Instant> suggestedTimes,

        @Schema(description = "Assunto (ex.: Apresentação de pitch)", example = "Apresentação de pitch",
                nullable = true)
        @Size(max = 40, message = "O assunto deve ter no máximo 40 caracteres")
        String subject,

        @Schema(description = "Mensagem para o outro participante", nullable = true)
        @Size(max = 280, message = "A mensagem deve ter no máximo 280 caracteres")
        String message,

        @Schema(description = "ONLINE (padrão) ou PRESENCIAL", nullable = true)
        MeetingFormat format,

        @Schema(description = "Nome do local. Só em PRESENCIAL", example = "Porto Digital", nullable = true)
        @Size(max = 150, message = "O nome do local deve ter no máximo 150 caracteres")
        String locationName,

        @Schema(description = "Endereço do local. Só em PRESENCIAL", nullable = true)
        @Size(max = 255, message = "O endereço deve ter no máximo 255 caracteres")
        String locationAddress,

        @Schema(description = "Referência do local. Só em PRESENCIAL", nullable = true)
        @Size(max = 255, message = "A referência deve ter no máximo 255 caracteres")
        String locationReference
) {

    /** Corpo do contrato antigo (T09b), com um horário só. */
    public MeetingCreateRequest(Long participantId, String title, String agenda, Instant startsAt,
                                Integer durationMinutes, String meetingUrl) {
        this(participantId, title, agenda, startsAt, durationMinutes, meetingUrl,
                null, null, null, null, null, null, null);
    }
}

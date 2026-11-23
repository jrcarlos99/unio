package br.com.unio.matchmaking_backend.interest.dto;

import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * D065: interesse que outra pessoa demonstrou no usuário logado e que ainda não virou match
 * (GET /api/interests/received). Só campos públicos: nunca e-mail, telefone, documento nem o
 * arquivo de pitch (o contato só sai depois do match, D052).
 */
@Schema(description = "Interesse recebido e ainda não correspondido. Sem e-mail, documento ou arquivo de pitch")
public record ReceivedInterestResponse(
        @Schema(description = "Id de quem demonstrou interesse (o mesmo de PUT /api/interests/{id})", example = "34")
        Long userId,
        @Schema(description = "Nome de exibição (o mesmo da descoberta)", example = "Ana Investimentos") String name,
        @Schema(allowableValues = {"STARTUP", "INVESTOR"}) String role,
        @Schema(nullable = true, description = "Startup: segmento. Investidor: segmentos de interesse, "
                + "separados por vírgula", example = "Logística") String segmento,
        @Schema(nullable = true, description = "Startup: estágio. Investidor: estágios de interesse, "
                + "separados por vírgula", example = "Seed") String estagio,
        @Schema(nullable = true, description = "Startup: cidade e UF como no cadastro. Investidor: região de "
                + "interesse", example = "Recife, PE") String localizacao,
        @Schema(nullable = true, description = "Último score já calculado do par (não recalcula)",
                example = "78.75") BigDecimal scoreFinal,
        @Schema(nullable = true) MatchScoreClassification classification,
        @Schema(description = "Quando o interesse foi demonstrado") Instant interestedAt
) {
}

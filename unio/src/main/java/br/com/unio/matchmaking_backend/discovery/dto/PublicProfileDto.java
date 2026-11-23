package br.com.unio.matchmaking_backend.discovery.dto;

import br.com.unio.matchmaking_backend.profile.entity.DisponibilidadeMentoria;
import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

/**
 * D046: campos públicos do perfil de um candidato. Só aparecem os do papel do
 * candidato (os outros ficam fora do JSON). Nunca e-mail, documento, senha, o JSON
 * de onboarding nem o arquivo de pitch.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Campos públicos do perfil. Startup: segmento até pitchCanvas. Investidor: "
        + "segmentosInteresse até regiaoInteresse. Sem e-mail, documento ou onboarding.")
public record PublicProfileDto(
        @Schema(description = "Só startup", example = "Logística") String segmento,
        @Schema(description = "Só startup", example = "Seed") String estagio,
        @Schema(description = "Só startup", example = "Recife, PE") String localizacao,
        @Schema(description = "Só startup", example = "B2B SaaS") String modeloNegocio,
        @Schema(description = "Só startup", example = "Transportadoras regionais") String mercadoAlvo,
        @Schema(description = "Só startup; opcional (D029)", example = "300000") BigDecimal capitalProcurado,
        @Schema(description = "Só startup: texto curto do cadastro; o arquivo de pitch não é exposto")
        String pitchCanvas,
        @Schema(description = "Só investidor") List<String> segmentosInteresse,
        @Schema(description = "Só investidor") List<String> estagiosInteresse,
        @Schema(description = "Só investidor", example = "50000") BigDecimal ticketMinimo,
        @Schema(description = "Só investidor", example = "300000") BigDecimal ticketMaximo,
        @Schema(description = "Só investidor: tipo de perfil", example = "Investidor Anjo") String perfilRisco,
        @Schema(description = "Só investidor") DisponibilidadeMentoria disponibilidade,
        @Schema(description = "Só investidor", example = "Nordeste") String regiaoInteresse
) {
}

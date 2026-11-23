package br.com.unio.matchmaking_backend.discovery.service;

import br.com.unio.matchmaking_backend.discovery.dto.PublicProfileDto;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Component;

/** D046: único lugar que decide quais campos do perfil são públicos. */
@Component
public class PublicProfileMapper {

    public PublicProfileDto of(Startup startup) {
        return new PublicProfileDto(
                startup.getSegmento(),
                startup.getEstagio(),
                startup.getLocalizacao(),
                startup.getModeloNegocio(),
                startup.getMercadoAlvo(),
                startup.getCapitalProcurado(),
                startup.getPitchCanvas(),
                null, null, null, null, null, null, null);
    }

    public PublicProfileDto of(Investor investor) {
        return new PublicProfileDto(
                null, null, null, null, null, null, null,
                csv(investor.getSegmentosInteresse()),
                csv(investor.getEstagiosInteresse()),
                investor.getTicketMinimo(),
                investor.getTicketMaximo(),
                investor.getPerfilRisco(),
                investor.getDisponibilidade(),
                investor.getRegiaoInteresse());
    }

    static List<String> csv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .toList();
    }
}

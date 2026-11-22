package br.com.unio.matchmaking_backend.discovery.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.discovery.dto.PublicProfileDto;
import br.com.unio.matchmaking_backend.match.repository.MatchInterestRepository;
import br.com.unio.matchmaking_backend.profile.dto.PublicInvestorProfileResponse;
import br.com.unio.matchmaking_backend.profile.dto.PublicStartupProfileResponse;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * D060: perfis públicos de GET /api/profile/startup/{id} e /api/profile/investor/{id} (T22 do
 * main), com as regras da descoberta (D046 e D052) num lugar só.
 *
 * <ul>
 *   <li>Os campos de perfil vêm do {@link PublicProfileMapper}, o mesmo da descoberta.</li>
 *   <li>Conta inexistente, removida, desativada ou sem perfil: 404.</li>
 *   <li>E-mail: só para o próprio titular, ADMIN ou quem tem match mútuo com ele (D052).</li>
 *   <li>Arquivo de pitch: só para o próprio titular e ADMIN (D046: depende de regra de
 *       visibilidade e moderação ainda não decidida).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class PublicProfileService {

    static final String STARTUP_NOT_FOUND = "Perfil Startup não encontrado";
    static final String INVESTOR_NOT_FOUND = "Perfil Investor não encontrado";

    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final ParticipantService participantService;
    private final PublicProfileMapper profileMapper;
    private final MatchInterestRepository matchInterestRepository;

    @Transactional(readOnly = true)
    public PublicStartupProfileResponse startup(AuthUser viewer, Long id) {
        Startup startup = startupRepository.findById(id)
                .filter(profile -> visible(profile.getUser()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, STARTUP_NOT_FOUND));

        User user = startup.getUser();
        PublicProfileDto profile = profileMapper.of(startup);
        boolean owner = ownerOrAdmin(viewer, user);
        return PublicStartupProfileResponse.builder()
                .id(user.getId())
                .email(revealContact(viewer, user) ? user.getEmail() : null)
                .createdAt(user.getCreatedAt())
                .nome(startup.getNome())
                .segmento(profile.segmento())
                .estagio(profile.estagio())
                .localizacao(profile.localizacao())
                .modeloNegocio(profile.modeloNegocio())
                .mercadoAlvo(profile.mercadoAlvo())
                .capitalProcurado(profile.capitalProcurado())
                .pitchCanvas(profile.pitchCanvas())
                .pitchFileUrl(owner ? startup.getPitchFileUrl() : null)
                .disponibilidade(startup.getDisponibilidade())
                .disponibilidadeObservacao(startup.getDisponibilidadeObservacao())
                .build();
    }

    @Transactional(readOnly = true)
    public PublicInvestorProfileResponse investor(AuthUser viewer, Long id) {
        Investor investor = investorRepository.findById(id)
                .filter(profile -> visible(profile.getUser()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, INVESTOR_NOT_FOUND));

        User user = investor.getUser();
        PublicProfileDto profile = profileMapper.of(investor);
        return PublicInvestorProfileResponse.builder()
                .id(user.getId())
                .email(revealContact(viewer, user) ? user.getEmail() : null)
                .createdAt(user.getCreatedAt())
                .segmentosInteresse(profile.segmentosInteresse())
                .estagiosInteresse(profile.estagiosInteresse())
                .ticketMinimo(profile.ticketMinimo())
                .ticketMaximo(profile.ticketMaximo())
                .regiaoInteresse(profile.regiaoInteresse())
                .perfilRisco(profile.perfilRisco())
                .disponibilidade(profile.disponibilidade())
                .disponibilidadeObservacao(investor.getDisponibilidadeObservacao())
                .build();
    }

    private boolean visible(User user) {
        return user != null && participantService.isActive(user);
    }

    private static boolean ownerOrAdmin(AuthUser viewer, User target) {
        return viewer != null
                && (viewer.getRole() == Role.ADMIN || Objects.equals(viewer.getId(), target.getId()));
    }

    /** D052: e-mail só para o titular, ADMIN ou quem tem match mútuo com ele. */
    private boolean revealContact(AuthUser viewer, User target) {
        if (ownerOrAdmin(viewer, target)) {
            return true;
        }
        return viewer != null
                && matchInterestRepository.existsActive(viewer.getId(), target.getId())
                && matchInterestRepository.existsActive(target.getId(), viewer.getId());
    }
}

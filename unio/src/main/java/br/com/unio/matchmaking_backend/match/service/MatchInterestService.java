package br.com.unio.matchmaking_backend.match.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.interest.service.InterestService;
import br.com.unio.matchmaking_backend.match.entity.MatchInterest;
import br.com.unio.matchmaking_backend.match.repository.MatchInterestRepository;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Contrato das rotas /api/matches (T23 do main): POST /interest com {startupId, investorId},
 * GET /api/matches e GET /api/matches/saved, devolvendo as linhas de match_interests.
 *
 * <p>D058: a regra de interesse e match é uma só, em {@link InterestService} (a mesma de
 * /api/interests). Este service mantém as validações e mensagens próprias do contrato
 * /api/matches (ids obrigatórios, "em seu próprio nome", 404 do outro lado) e delega a
 * gravação e as consultas.
 */
@Service
@RequiredArgsConstructor
public class MatchInterestService {

    private final MatchInterestRepository matchInterestRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final InterestService interestService;

    @Transactional
    public MatchInterest like(AuthUser authUser, Long startupId, Long investorId) {
        validateParticipant(authUser, startupId, investorId);

        Long counterpartId = authUser.getRole() == Role.STARTUP ? investorId : startupId;
        interestService.express(authUser, counterpartId);

        return matchInterestRepository
                .findByStartupIdAndInvestorIdAndLikedByUserId(startupId, investorId, authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Interesse não foi gravado"));
    }

    /** Linhas do usuário com match confirmado (status MATCHED). */
    @Transactional(readOnly = true)
    public List<MatchInterest> listMatches(AuthUser authUser) {
        requireParticipant(authUser);
        return interestService.matchedRowsOf(authUser);
    }

    /**
     * Interesses enviados que ainda aguardam o outro lado (status LIKED). Não confundir com
     * os perfis salvos (bookmark) de GET /api/saved (D050).
     */
    @Transactional(readOnly = true)
    public List<MatchInterest> listSaved(AuthUser authUser) {
        requireParticipant(authUser);
        return interestService.pendingSentRowsOf(authUser);
    }

    private void validateParticipant(AuthUser authUser, Long startupId, Long investorId) {
        requireParticipant(authUser);
        if (startupId == null || investorId == null || startupId.equals(investorId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "startupId e investorId são obrigatórios e devem ser diferentes");
        }

        if (authUser.getRole() == Role.STARTUP) {
            if (!authUser.getId().equals(startupId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "A startup autenticada só pode criar interesses em seu próprio nome");
            }
            if (!investorRepository.existsById(investorId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Investidor não encontrado");
            }
        } else {
            if (!authUser.getId().equals(investorId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "O investidor autenticado só pode criar interesses em seu próprio nome");
            }
            if (!startupRepository.existsById(startupId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Startup não encontrada");
            }
        }
    }

    private void requireParticipant(AuthUser authUser) {
        if (authUser == null || authUser.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Apenas startups e investidores podem usar matches");
        }
    }
}

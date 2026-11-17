package br.com.unio.matchmaking_backend.match.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.match.entity.MatchInterest;
import br.com.unio.matchmaking_backend.match.entity.MatchInterestStatus;
import br.com.unio.matchmaking_backend.match.repository.MatchInterestRepository;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MatchInterestService {

    private final MatchInterestRepository matchInterestRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;

    @Transactional
    public MatchInterest like(AuthUser authUser, Long startupId, Long investorId) {
        validateParticipant(authUser, startupId, investorId);

        MatchInterest interest = matchInterestRepository
                .findByStartupIdAndInvestorIdAndLikedByUserId(
                        startupId, investorId, authUser.getId())
                .orElseGet(() -> MatchInterest.builder()
                        .startupId(startupId)
                        .investorId(investorId)
                        .likedByUserId(authUser.getId())
                        .status(MatchInterestStatus.LIKED)
                        .build());

        if (interest.getStatus() == MatchInterestStatus.MATCHED) {
            return interest;
        }

        interest.setStatus(MatchInterestStatus.LIKED);
        MatchInterest savedInterest = matchInterestRepository.save(interest);

        MatchInterest reciprocalInterest = matchInterestRepository
                .findByStartupIdAndInvestorIdAndLikedByUserIdNot(
                        startupId, investorId, authUser.getId())
                .stream()
                .filter(item -> item.getStatus() == MatchInterestStatus.LIKED)
                .findFirst()
                .orElse(null);
        if (reciprocalInterest != null
                && reciprocalInterest.getLikedByUserId() != null) {
            savedInterest.setStatus(MatchInterestStatus.MATCHED);
            reciprocalInterest.setStatus(MatchInterestStatus.MATCHED);
            matchInterestRepository.save(reciprocalInterest);
            return matchInterestRepository.save(savedInterest);
        }

        return savedInterest;
    }

    @Transactional(readOnly = true)
    public List<MatchInterest> listMatches(AuthUser authUser) {
        requireParticipant(authUser);
        return matchInterestRepository.findByLikedByUserIdAndStatusOrderByCreatedAtDesc(
                authUser.getId(), MatchInterestStatus.MATCHED);
    }

    @Transactional(readOnly = true)
    public List<MatchInterest> listSaved(AuthUser authUser) {
        requireParticipant(authUser);
        return matchInterestRepository.findByLikedByUserIdAndStatusOrderByCreatedAtDesc(
                authUser.getId(), MatchInterestStatus.LIKED);
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

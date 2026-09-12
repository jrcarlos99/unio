package br.com.unio.matchmaking_backend.scorecard.policy.service;

import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicyRepository;
import br.com.unio.matchmaking_backend.scorecard.policy.dto.ScorePolicyCreateRequest;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScorePolicyService {

    private final ScorePolicyRepository scorePolicyRepository;

    @Transactional
    public ScorePolicy create(ScorePolicyCreateRequest request) {
        if (Boolean.TRUE.equals(request.getActive())) {
            scorePolicyRepository.findByInvestorProfileTypeAndActiveTrue(request.getInvestorProfileType())
                .ifPresent(currentActive -> {
                    currentActive.setActive(false);
                    scorePolicyRepository.save(currentActive);
                });
        }

        ScorePolicy policy = ScorePolicy.builder()
            .investorProfileType(request.getInvestorProfileType())
            .version(request.getVersion())
            .active(Boolean.TRUE.equals(request.getActive()))
            .name(request.getName())
            .createdAt(Instant.now())
            .build();

        return scorePolicyRepository.save(policy);
    }

    public Optional<ScorePolicy> findActiveByProfileType(InvestorProfileType type) {
        return scorePolicyRepository.findByInvestorProfileTypeAndActiveTrue(type);
    }

    public List<ScorePolicy> findByProfileType(InvestorProfileType type) {
        return scorePolicyRepository.findByInvestorProfileType(type);
    }
}

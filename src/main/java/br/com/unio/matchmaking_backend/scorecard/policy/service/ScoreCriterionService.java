package br.com.unio.matchmaking_backend.scorecard.policy.service;

import br.com.unio.matchmaking_backend.scorecard.common.exception.CriterionCodeAlreadyExistsException;
import br.com.unio.matchmaking_backend.scorecard.common.exception.CriterionNotFoundException;
import br.com.unio.matchmaking_backend.scorecard.common.exception.PolicyNotFoundException;
import br.com.unio.matchmaking_backend.scorecard.policy.ScoreCriterion;
import br.com.unio.matchmaking_backend.scorecard.policy.ScoreCriterionRepository;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicyRepository;
import br.com.unio.matchmaking_backend.scorecard.policy.dto.ScoreCriterionCreateRequest;
import br.com.unio.matchmaking_backend.scorecard.policy.dto.ScoreCriterionUpdateRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScoreCriterionService {

    private final ScoreCriterionRepository scoreCriterionRepository;
    private final ScorePolicyRepository scorePolicyRepository;

    @Transactional
    public ScoreCriterion create(Long policyId, ScoreCriterionCreateRequest request) {
        ScorePolicy policy = scorePolicyRepository.findById(policyId)
                .orElseThrow(() -> new PolicyNotFoundException("POLICY_NOT_FOUND"));

        boolean codeExists = scoreCriterionRepository
                .findByScorePolicyIdAndActiveTrue(policyId).stream()
                .anyMatch(c -> c.getCode().equalsIgnoreCase(request.getCode()));

        if (codeExists) {
            throw new CriterionCodeAlreadyExistsException("CRITERION_CODE_ALREADY_EXISTS");
        }

        ScoreCriterion criterion = ScoreCriterion.builder()
                .scorePolicy(policy)
                .code(request.getCode())
                .label(request.getLabel())
                .dimension(request.getDimension())
                .weight(request.getWeight())
                .criticality(request.getCriticality())
                .active(true)
                .build();

        return scoreCriterionRepository.save(criterion);
    }

    public List<ScoreCriterion> findByPolicy(Long policyId) {
        return scoreCriterionRepository.findByScorePolicyIdAndActiveTrue(policyId);
    }

    @Transactional
    public ScoreCriterion update(Long criterionId, ScoreCriterionUpdateRequest request) {
        ScoreCriterion criterion = scoreCriterionRepository.findById(criterionId)
                .orElseThrow(() -> new CriterionNotFoundException("CRITERION_NOT_FOUND"));

        criterion.setLabel(request.getLabel());
        criterion.setWeight(request.getWeight());
        criterion.setCriticality(request.getCriticality());
        criterion.setActive(request.getActive());

        return scoreCriterionRepository.save(criterion);
    }

    @Transactional
    public void deactivate(Long criterionId) {
        ScoreCriterion criterion = scoreCriterionRepository.findById(criterionId)
                .orElseThrow(() -> new CriterionNotFoundException("CRITERION_NOT_FOUND"));

        criterion.setActive(false);
        scoreCriterionRepository.save(criterion);
    }
}
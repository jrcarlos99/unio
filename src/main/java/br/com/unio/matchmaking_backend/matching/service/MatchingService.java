package br.com.unio.matchmaking_backend.matching.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.matching.dto.MatchCriteriaWeightRequest;
import br.com.unio.matchmaking_backend.matching.dto.SwipeRequest;
import br.com.unio.matchmaking_backend.matching.entity.MatchCriteriaWeight;
import br.com.unio.matchmaking_backend.matching.entity.MatchScore;
import br.com.unio.matchmaking_backend.matching.entity.SwipeAction;
import br.com.unio.matchmaking_backend.matching.repository.MatchCriteriaWeightRepository;
import br.com.unio.matchmaking_backend.matching.repository.MatchScoreRepository;
import br.com.unio.matchmaking_backend.matching.repository.SwipeActionRepository;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MatchingService {

    private final MatchCriteriaWeightRepository matchCriteriaWeightRepository;
    private final MatchScoreRepository matchScoreRepository;
    private final SwipeActionRepository swipeActionRepository;
    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;

    private static final BigDecimal DEFAULT_WEIGHT_SEGMENTO = new BigDecimal("0.35");
    private static final BigDecimal DEFAULT_WEIGHT_ESTAGIO = new BigDecimal("0.25");
    private static final BigDecimal DEFAULT_WEIGHT_TICKET = new BigDecimal("0.25");
    private static final BigDecimal DEFAULT_WEIGHT_REGIAO = new BigDecimal("0.15");

    public List<Map<String, Object>> getCriteriaWeights() {
        ensureDefaultWeights();
        return matchCriteriaWeightRepository.findByActiveTrueOrderByIdAsc().stream()
            .map(this::toWeightMap)
            .toList();
    }

    @Transactional
    public List<Map<String, Object>> updateCriteriaWeights(List<MatchCriteriaWeightRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lista de pesos não pode ser vazia");
        }

        for (MatchCriteriaWeightRequest request : requests) {
            MatchCriteriaWeight.CriteriaType criteriaType = MatchCriteriaWeight.CriteriaType.valueOf(request.getCriteria().trim().toUpperCase());
            MatchCriteriaWeight entity = matchCriteriaWeightRepository.findByCriteria(criteriaType);
            if (entity == null) {
                entity = MatchCriteriaWeight.builder()
                    .criteria(criteriaType)
                    .active(true)
                    .updatedAt(Instant.now())
                    .build();
            }
            entity.setWeight(request.getWeight());
            entity.setActive(true);
            entity.setUpdatedAt(Instant.now());
            matchCriteriaWeightRepository.save(entity);
        }

        return getCriteriaWeights();
    }

    public List<Map<String, Object>> getRecommendations(AuthUser authUser) {
        User user = userRepository.findById(authUser.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        List<Map<String, Object>> results = new ArrayList<>();
        if (user.getRole() == Role.STARTUP) {
            Startup startup = startupRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil de startup não encontrado"));
            List<Investor> investors = investorRepository.findAll();
            for (Investor investor : investors) {
                Map<String, Object> score = evaluateStartupToInvestor(startup, investor);
                saveScore(user.getId(), investor.getUser().getId(), (BigDecimal) score.get("score"), "segmento,estagio,capital,regiao");
                results.add(score);
            }
        } else if (user.getRole() == Role.INVESTOR) {
            Investor investor = investorRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil de investidor não encontrado"));
            List<Startup> startups = startupRepository.findAll();
            for (Startup startup : startups) {
                Map<String, Object> score = evaluateInvestorToStartup(investor, startup);
                saveScore(user.getId(), startup.getUser().getId(), (BigDecimal) score.get("score"), "segmento,estagio,capital,regiao");
                results.add(score);
            }
        } else {
            return List.of();
        }

        return results.stream()
            .sorted((a, b) -> ((BigDecimal) b.get("score")).compareTo((BigDecimal) a.get("score")))
            .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> swipe(AuthUser authUser, SwipeRequest request) {
        User user = userRepository.findById(authUser.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        if (request.getTargetUserId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você não pode dar swipe em si mesmo");
        }

        String actionType = request.getAction().trim().toUpperCase();
        if (!Set.of("LIKE", "DISLIKE").contains(actionType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ação inválida. Use LIKE ou DISLIKE");
        }

        SwipeAction existing = swipeActionRepository.findBySourceUserIdAndTargetUserId(user.getId(), request.getTargetUserId()).orElse(null);
        if (existing != null) {
            existing.setActionType(actionType);
            existing.setCreatedAt(Instant.now());
            swipeActionRepository.save(existing);
        } else {
            SwipeAction swipe = SwipeAction.builder()
                .sourceUserId(user.getId())
                .targetUserId(request.getTargetUserId())
                .actionType(actionType)
                .createdAt(Instant.now())
                .build();
            swipeActionRepository.save(swipe);
        }

        boolean mutualMatch = "LIKE".equalsIgnoreCase(actionType)
            && swipeActionRepository.findBySourceUserIdAndTargetUserId(request.getTargetUserId(), user.getId())
                .map(s -> "LIKE".equalsIgnoreCase(s.getActionType()))
                .orElse(false);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("sourceUserId", user.getId());
        response.put("targetUserId", request.getTargetUserId());
        response.put("action", actionType);
        response.put("mutualMatch", mutualMatch);
        response.put("message", mutualMatch ? "Match mútuo liberado para chat" : "Ação registrada");
        return response;
    }

    public List<Map<String, Object>> getMutualMatches(AuthUser authUser) {
        User user = userRepository.findById(authUser.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        List<SwipeAction> outgoingLikes = swipeActionRepository.findBySourceUserId(user.getId()).stream()
            .filter(action -> "LIKE".equalsIgnoreCase(action.getActionType()))
            .toList();

        List<Map<String, Object>> results = new ArrayList<>();
        for (SwipeAction action : outgoingLikes) {
            SwipeAction reciprocal = swipeActionRepository.findBySourceUserIdAndTargetUserId(action.getTargetUserId(), user.getId()).orElse(null);
            if (reciprocal != null && "LIKE".equalsIgnoreCase(reciprocal.getActionType())) {
                Map<String, Object> match = new LinkedHashMap<>();
                match.put("userId", action.getTargetUserId());
                match.put("matchType", user.getRole() == Role.STARTUP ? "INVESTOR" : "STARTUP");
                match.put("matchedAt", reciprocal.getCreatedAt());
                results.add(match);
            }
        }
        return results;
    }

    private Map<String, Object> toWeightMap(MatchCriteriaWeight weight) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", weight.getId());
        payload.put("criteria", weight.getCriteria().name());
        payload.put("weight", weight.getWeight());
        payload.put("active", weight.isActive());
        payload.put("updatedAt", weight.getUpdatedAt());
        return payload;
    }

    private void ensureDefaultWeights() {
        List<MatchCriteriaWeight.CriteriaType> required = List.of(
            MatchCriteriaWeight.CriteriaType.SEGMENTO,
            MatchCriteriaWeight.CriteriaType.ESTAGIO,
            MatchCriteriaWeight.CriteriaType.TICKET_CAPITAL,
            MatchCriteriaWeight.CriteriaType.REGIAO
        );

        for (MatchCriteriaWeight.CriteriaType criteria : required) {
            if (matchCriteriaWeightRepository.findByCriteria(criteria) == null) {
                MatchCriteriaWeight entity = MatchCriteriaWeight.builder()
                    .criteria(criteria)
                    .weight(defaultWeight(criteria))
                    .active(true)
                    .updatedAt(Instant.now())
                    .build();
                matchCriteriaWeightRepository.save(entity);
            }
        }
    }

    private BigDecimal defaultWeight(MatchCriteriaWeight.CriteriaType criteria) {
        return switch (criteria) {
            case SEGMENTO -> DEFAULT_WEIGHT_SEGMENTO;
            case ESTAGIO -> DEFAULT_WEIGHT_ESTAGIO;
            case TICKET_CAPITAL -> DEFAULT_WEIGHT_TICKET;
            case REGIAO -> DEFAULT_WEIGHT_REGIAO;
        };
    }

    private Map<String, Object> evaluateStartupToInvestor(Startup startup, Investor investor) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", investor.getUser().getId());
        payload.put("role", Role.INVESTOR.name());
        payload.put("email", investor.getUser().getEmail());
        BigDecimal score = calculateScore(startup, investor);
        payload.put("score", score.setScale(2, RoundingMode.HALF_UP));
        payload.put("segmento", startup.getSegmento());
        return payload;
    }

    private Map<String, Object> evaluateInvestorToStartup(Investor investor, Startup startup) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", startup.getUser().getId());
        payload.put("role", Role.STARTUP.name());
        payload.put("email", startup.getUser().getEmail());
        BigDecimal score = calculateScore(startup, investor);
        payload.put("score", score.setScale(2, RoundingMode.HALF_UP));
        payload.put("segmento", startup.getSegmento());
        return payload;
    }

    private BigDecimal calculateScore(Startup startup, Investor investor) {
        BigDecimal weightSegmento = getWeight(MatchCriteriaWeight.CriteriaType.SEGMENTO);
        BigDecimal weightEstagio = getWeight(MatchCriteriaWeight.CriteriaType.ESTAGIO);
        BigDecimal weightTicket = getWeight(MatchCriteriaWeight.CriteriaType.TICKET_CAPITAL);
        BigDecimal weightRegiao = getWeight(MatchCriteriaWeight.CriteriaType.REGIAO);

        BigDecimal sum = BigDecimal.ZERO;
        BigDecimal segmentoScore = hasValue(startup.getSegmento(), investor.getSegmentosInteresse()) ? BigDecimal.ONE : BigDecimal.ZERO;
        BigDecimal estagioScore = hasValue(startup.getEstagio(), investor.getEstagiosInteresse()) ? BigDecimal.ONE : BigDecimal.ZERO;
        BigDecimal ticketScore = calculateTicketMatch(startup.getCapitalProcurado(), investor.getTicketMinimo(), investor.getTicketMaximo());
        BigDecimal regiaoScore = matchesRegion(startup.getLocalizacao(), investor.getRegiaoInteresse()) ? BigDecimal.ONE : BigDecimal.ZERO;

        sum = sum.add(segmentoScore.multiply(weightSegmento));
        sum = sum.add(estagioScore.multiply(weightEstagio));
        sum = sum.add(ticketScore.multiply(weightTicket));
        sum = sum.add(regiaoScore.multiply(weightRegiao));
        return sum.multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
    }

    private void saveScore(Long sourceUserId, Long targetUserId, BigDecimal score, String criteriaSummary) {
        MatchScore existing = matchScoreRepository.findBySourceUserIdAndTargetUserId(sourceUserId, targetUserId);
        if (existing != null) {
            existing.setScore(score);
            existing.setCriteriaSummary(criteriaSummary);
            existing.setEvaluatedAt(Instant.now());
            matchScoreRepository.save(existing);
            return;
        }

        MatchScore entity = MatchScore.builder()
            .sourceUserId(sourceUserId)
            .targetUserId(targetUserId)
            .score(score)
            .criteriaSummary(criteriaSummary)
            .evaluatedAt(Instant.now())
            .build();
        matchScoreRepository.save(entity);
    }

    private BigDecimal getWeight(MatchCriteriaWeight.CriteriaType criteriaType) {
        ensureDefaultWeights();
        MatchCriteriaWeight weight = matchCriteriaWeightRepository.findByCriteria(criteriaType);
        if (weight == null) {
            return defaultWeight(criteriaType);
        }
        return weight.getWeight();
    }

    private boolean hasValue(String value, String csv) {
        if (value == null || csv == null || csv.isBlank()) {
            return false;
        }
        for (String item : csv.split(",")) {
            if (value.equalsIgnoreCase(item.trim())) {
                return true;
            }
        }
        return false;
    }

    private BigDecimal calculateTicketMatch(BigDecimal startupCapital, BigDecimal investorMin, BigDecimal investorMax) {
        if (startupCapital == null || investorMin == null || investorMax == null) {
            return BigDecimal.ZERO;
        }
        if (startupCapital.compareTo(investorMin) >= 0 && startupCapital.compareTo(investorMax) <= 0) {
            return BigDecimal.ONE;
        }
        if (startupCapital.compareTo(investorMax) > 0) {
            BigDecimal delta = startupCapital.subtract(investorMax).divide(investorMax, 4, RoundingMode.HALF_UP);
            if (delta.compareTo(BigDecimal.ONE) <= 0) {
                return BigDecimal.valueOf(0.7);
            }
        }
        if (startupCapital.compareTo(investorMin) < 0) {
            BigDecimal delta = investorMin.subtract(startupCapital).divide(investorMin, 4, RoundingMode.HALF_UP);
            if (delta.compareTo(BigDecimal.ONE) <= 0) {
                return BigDecimal.valueOf(0.6);
            }
        }
        return BigDecimal.ZERO;
    }

    private boolean matchesRegion(String startupLocation, String investorRegion) {
        if (startupLocation == null || investorRegion == null || investorRegion.isBlank()) {
            return false;
        }
        return startupLocation.equalsIgnoreCase(investorRegion.trim());
    }
}

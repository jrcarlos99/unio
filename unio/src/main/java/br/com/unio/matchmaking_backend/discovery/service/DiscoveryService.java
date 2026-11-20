package br.com.unio.matchmaking_backend.discovery.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.discovery.dto.DiscoveryItemResponse;
import br.com.unio.matchmaking_backend.discovery.dto.DiscoveryPageResponse;
import br.com.unio.matchmaking_backend.discovery.dto.PublicProfileDto;
import br.com.unio.matchmaking_backend.discovery.dto.ScorecardRefDto;
import br.com.unio.matchmaking_backend.interest.dto.InterestStatus;
import br.com.unio.matchmaking_backend.interest.service.InterestService;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.CriterionEvaluation;
import br.com.unio.matchmaking_backend.scorecard.calculation.dto.ScoreCalculationResult;
import br.com.unio.matchmaking_backend.scorecard.calculation.service.ScoreCalculatorService;
import br.com.unio.matchmaking_backend.scorecard.calculation.service.ScorePersistenceService;
import br.com.unio.matchmaking_backend.scorecard.common.CriticalityLevel;
import br.com.unio.matchmaking_backend.scorecard.common.InvestorProfileType;
import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreClassification;
import br.com.unio.matchmaking_backend.scorecard.common.MatchScoreFactorType;
import br.com.unio.matchmaking_backend.scorecard.common.ScorecardAccess;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.FactorDto;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.MatchScoreExplanationResponse;
import br.com.unio.matchmaking_backend.scorecard.explanation.dto.NextStepDto;
import br.com.unio.matchmaking_backend.scorecard.explanation.service.ExplanationService;
import br.com.unio.matchmaking_backend.scorecard.policy.ScorePolicy;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * D045 e D046: descoberta com score sob demanda.
 *
 * <p>Para o usuário logado, monta os candidatos do papel complementar (STARTUP vê
 * INVESTOR e vice-versa): usuários ativos, com perfil criado. Para cada par, usa o
 * score já gravado em match_scores quando ele é mais novo que os dois perfis
 * (updated_at, V27) e da política ativa do investidor; senão, calcula e grava com o
 * {@link ScorePersistenceService} (a regra de cálculo não muda).
 *
 * <p>Limitação de escala (D045): no máximo
 * {@code unio.discovery.max-calculations-per-request} (padrão 200) cálculos por
 * requisição. Pares além disso usam o score antigo, se houver, ou ficam fora da
 * página e entram em {@code notCalculated}; as leituras seguintes completam.
 *
 * <p>Critério CRITICAL violado (D047): o par vira "sem match" (score 0,
 * SEM_MATCH) sem gravar nada e sem derrubar a lista.
 */
@Service
public class DiscoveryService {

    static final int DEFAULT_LIMIT = 20;
    static final int MAX_LIMIT = 100;
    static final String CRITICAL_NEXT_STEP_CODE = "CRITICAL_CRITERION_VIOLATED";
    static final String CRITICAL_NEXT_STEP_TEXT =
            "Um critério eliminatório da política de score não foi atendido.";
    private static final BigDecimal ZERO_SCORE = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private final ParticipantService participantService;
    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final MatchScoreRepository matchScoreRepository;
    private final ScorePersistenceService scorePersistenceService;
    private final ScoreCalculatorService scoreCalculatorService;
    private final ExplanationService explanationService;
    private final PublicProfileMapper profileMapper;
    private final InterestService interestService;
    private final int maxCalculationsPerRequest;

    public DiscoveryService(ParticipantService participantService,
                            UserRepository userRepository,
                            StartupRepository startupRepository,
                            InvestorRepository investorRepository,
                            MatchScoreRepository matchScoreRepository,
                            ScorePersistenceService scorePersistenceService,
                            ScoreCalculatorService scoreCalculatorService,
                            ExplanationService explanationService,
                            PublicProfileMapper profileMapper,
                            InterestService interestService,
                            @Value("${unio.discovery.max-calculations-per-request:200}") int maxCalculationsPerRequest) {
        this.participantService = participantService;
        this.userRepository = userRepository;
        this.startupRepository = startupRepository;
        this.investorRepository = investorRepository;
        this.matchScoreRepository = matchScoreRepository;
        this.scorePersistenceService = scorePersistenceService;
        this.scoreCalculatorService = scoreCalculatorService;
        this.explanationService = explanationService;
        this.profileMapper = profileMapper;
        this.interestService = interestService;
        this.maxCalculationsPerRequest = Math.max(0, maxCalculationsPerRequest);
    }

    /** Filtros opcionais da lista (D046). */
    public record Filter(String q, String segmento, String estagio, String tipo, BigDecimal minScore,
                         Integer limit, Integer offset) {
    }

    // ============================================================
    // Endpoints
    // ============================================================

    /** GET /api/discovery/startups (investidor logado). */
    @Transactional
    public DiscoveryPageResponse listStartups(AuthUser authUser, Filter filter) {
        Investor me = requireInvestor(authUser);
        Map<String, MatchScore> stored = indexByCounterpart(
                matchScoreRepository.findByInvestorId(ScorecardAccess.scorecardId(me.getId())),
                MatchScore::getStartupId);
        List<Candidate> candidates = activeProfiles(startupRepository.findAll(), Startup::getId, Role.STARTUP)
                .stream()
                .map(pair -> new Candidate(pair.user(), (Startup) pair.profile(), me))
                .filter(candidate -> matchesStartupFilters(candidate, filter))
                .toList();
        return page(me.getId(), candidates, stored, filter);
    }

    /** GET /api/discovery/investors (startup logada). */
    @Transactional
    public DiscoveryPageResponse listInvestors(AuthUser authUser, Filter filter) {
        Startup me = requireStartup(authUser);
        Map<String, MatchScore> stored = indexByCounterpart(
                matchScoreRepository.findByStartupId(ScorecardAccess.scorecardId(me.getId())),
                MatchScore::getInvestorId);
        List<Candidate> candidates = activeProfiles(investorRepository.findAll(), Investor::getId, Role.INVESTOR)
                .stream()
                .map(pair -> new Candidate(pair.user(), me, (Investor) pair.profile()))
                .filter(candidate -> matchesInvestorFilters(candidate, filter))
                .toList();
        return page(me.getId(), candidates, stored, filter);
    }

    /** GET /api/discovery/startups/{userId}. */
    @Transactional
    public DiscoveryItemResponse startupDetail(AuthUser authUser, Long userId) {
        Investor me = requireInvestor(authUser);
        Startup startup = startupRepository.findById(userId)
                .filter(profile -> isActive(profile.getId(), Role.STARTUP))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Startup não encontrada"));
        Candidate candidate = new Candidate(participantService.findUser(userId), startup, me);
        return detail(me.getId(), candidate);
    }

    /** GET /api/discovery/investors/{userId}. */
    @Transactional
    public DiscoveryItemResponse investorDetail(AuthUser authUser, Long userId) {
        Startup me = requireStartup(authUser);
        Investor investor = investorRepository.findById(userId)
                .filter(profile -> isActive(profile.getId(), Role.INVESTOR))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investidor não encontrado"));
        Candidate candidate = new Candidate(participantService.findUser(userId), me, investor);
        return detail(me.getId(), candidate);
    }

    // ============================================================
    // Lista e detalhe
    // ============================================================

    private DiscoveryPageResponse page(Long meId, List<Candidate> candidates, Map<String, MatchScore> stored,
                                       Filter filter) {
        Budget budget = new Budget(maxCalculationsPerRequest);
        Map<InvestorProfileType, ScorePolicy> policies = new EnumMap<>(InvestorProfileType.class);

        List<Scored> scored = new ArrayList<>();
        int notCalculated = 0;
        for (Candidate candidate : candidates) {
            Outcome outcome = score(candidate, stored, policies, budget);
            if (outcome == null) {
                notCalculated++;
                continue;
            }
            scored.add(new Scored(candidate, outcome, participantService.displayName(candidate.user())));
        }

        BigDecimal minScore = filter == null ? null : filter.minScore();
        List<Scored> sorted = scored.stream()
                .filter(item -> minScore == null || item.outcome().score().compareTo(minScore) >= 0)
                .sorted(Comparator.comparing((Scored item) -> item.outcome().score()).reversed()
                        .thenComparing(Scored::name, String.CASE_INSENSITIVE_ORDER))
                .toList();

        int limit = clampLimit(filter == null ? null : filter.limit());
        int offset = Math.max(0, filter == null || filter.offset() == null ? 0 : filter.offset());
        Map<Long, InterestStatus> statuses = interestService.statusesOf(meId);
        Set<Long> saved = interestService.savedIdsOf(meId);

        List<DiscoveryItemResponse> items = sorted.stream()
                .skip(offset)
                .limit(limit)
                .map(item -> toItem(item, statuses, saved))
                .toList();
        return new DiscoveryPageResponse(sorted.size(), limit, offset, notCalculated, items);
    }

    private DiscoveryItemResponse detail(Long meId, Candidate candidate) {
        Map<String, MatchScore> stored = indexByCounterpart(
                matchScoreRepository.findAllByInvestorIdAndStartupId(
                        ScorecardAccess.scorecardId(candidate.investor().getId()),
                        ScorecardAccess.scorecardId(candidate.startup().getId())),
                score -> ScorecardAccess.scorecardId(candidate.counterpartId()));
        Outcome outcome = score(candidate, stored, new EnumMap<>(InvestorProfileType.class), new Budget(1));
        Scored scored = new Scored(candidate, outcome, participantService.displayName(candidate.user()));
        return toItem(scored, interestService.statusesOf(meId), interestService.savedIdsOf(meId));
    }

    // ============================================================
    // Score sob demanda (D045)
    // ============================================================

    /**
     * Score do par: o gravado, se estiver em dia; senão calcula (se ainda houver
     * cálculos no orçamento). Null quando não há score e o orçamento acabou.
     */
    private Outcome score(Candidate candidate, Map<String, MatchScore> stored,
                          Map<InvestorProfileType, ScorePolicy> policies, Budget budget) {
        Startup startup = candidate.startup();
        Investor investor = candidate.investor();
        ScorePolicy policy = policies.computeIfAbsent(
                ScorePersistenceService.mapToProfileType(investor.getPerfilRisco()),
                type -> scorePersistenceService.resolvePolicy(investor));

        UUID startupUuid = ScorecardAccess.scorecardId(startup.getId());
        UUID investorUuid = ScorecardAccess.scorecardId(investor.getId());
        MatchScore existing = stored.get(key(candidate.counterpartId(), policy.getId()));

        if (existing != null && isFresh(existing, startup, investor)) {
            return Outcome.stored(existing);
        }
        if (!budget.tryUse()) {
            return existing == null ? null : Outcome.stored(existing);
        }

        // Confere o critério eliminatório antes de gravar: o calculateAndPersist lança
        // exceção nesse caso e marcaria a transação inteira para rollback.
        ScoreCalculationResult preview = scoreCalculatorService.calculate(startup, investor, policy);
        if (preview.isCriticalViolation()) {
            return Outcome.critical(new ScorecardRefDto(startupUuid, investorUuid, policy.getId()),
                    criticalFactors(preview));
        }
        return Outcome.stored(scorePersistenceService.calculateAndPersist(startup, investor).getMatchScore());
    }

    /** O score vale se foi calculado depois da última alteração dos dois perfis. */
    static boolean isFresh(MatchScore score, Startup startup, Investor investor) {
        Instant calculatedAt = score.getCalculatedAt();
        if (calculatedAt == null) {
            return false;
        }
        return notAfter(startup.getUpdatedAt(), calculatedAt) && notAfter(investor.getUpdatedAt(), calculatedAt);
    }

    private static boolean notAfter(Instant changedAt, Instant calculatedAt) {
        return changedAt == null || !changedAt.isAfter(calculatedAt);
    }

    private static List<FactorDto> criticalFactors(ScoreCalculationResult result) {
        List<FactorDto> factors = new ArrayList<>();
        int rank = 1;
        for (CriterionEvaluation evaluation : result.getCriterionEvaluations()) {
            if (evaluation.getCriticality() == CriticalityLevel.CRITICAL && evaluation.isFailed()) {
                factors.add(FactorDto.builder()
                        .type(MatchScoreFactorType.ATTENTION)
                        .rank(rank++)
                        .dimension(evaluation.getDimension())
                        .factorCode(evaluation.getCode())
                        .factorLabel(evaluation.getCode())
                        .factorScore(evaluation.getAdjustedScore())
                        .weightApplied(evaluation.getWeight())
                        .explanation(evaluation.getExplanation())
                        .build());
            }
        }
        return factors;
    }

    // ============================================================
    // Montagem do item
    // ============================================================

    private DiscoveryItemResponse toItem(Scored scored, Map<Long, InterestStatus> statuses, Set<Long> saved) {
        Candidate candidate = scored.candidate();
        Outcome outcome = scored.outcome();
        User user = candidate.user();
        PublicProfileDto profile = user.getRole() == Role.STARTUP
                ? profileMapper.of(candidate.startup())
                : profileMapper.of(candidate.investor());
        InterestStatus status = statuses.getOrDefault(user.getId(), InterestStatus.NONE);
        boolean isSaved = saved.contains(user.getId());

        if (outcome.matchScore() == null) {
            return new DiscoveryItemResponse(user.getId(), scored.name(), user.getRole().name(), profile,
                    ZERO_SCORE, MatchScoreClassification.SEM_MATCH, List.of(), List.of(),
                    outcome.criticalFactors(),
                    NextStepDto.builder().code(CRITICAL_NEXT_STEP_CODE).text(CRITICAL_NEXT_STEP_TEXT).build(),
                    outcome.ref(), status, isSaved, null);
        }

        MatchScoreExplanationResponse explanation = explanationService.buildExplanation(outcome.matchScore());
        return new DiscoveryItemResponse(user.getId(), scored.name(), user.getRole().name(), profile,
                explanation.getScoreFinal(), explanation.getClassification(), explanation.getDimensions(),
                explanation.getTopPositiveFactors(), explanation.getTopAttentionFactors(),
                explanation.getNextStep(),
                new ScorecardRefDto(explanation.getStartupId(), explanation.getInvestorId(),
                        explanation.getScorePolicyId()),
                status, isSaved, explanation.getCalculatedAt());
    }

    // ============================================================
    // Filtros (D046)
    // ============================================================

    private boolean matchesStartupFilters(Candidate candidate, Filter filter) {
        if (filter == null) {
            return true;
        }
        Startup startup = candidate.startup();
        if (!blank(filter.segmento()) && !sameText(startup.getSegmento(), filter.segmento())) {
            return false;
        }
        if (!blank(filter.estagio()) && !sameText(startup.getEstagio(), filter.estagio())) {
            return false;
        }
        return blank(filter.q()) || contains(filter.q(), participantService.displayName(candidate.user()),
                startup.getSegmento(), startup.getEstagio(), startup.getLocalizacao(),
                startup.getModeloNegocio(), startup.getMercadoAlvo());
    }

    private boolean matchesInvestorFilters(Candidate candidate, Filter filter) {
        if (filter == null) {
            return true;
        }
        Investor investor = candidate.investor();
        List<String> segmentos = PublicProfileMapper.csv(investor.getSegmentosInteresse());
        List<String> estagios = PublicProfileMapper.csv(investor.getEstagiosInteresse());
        if (!blank(filter.segmento()) && segmentos.stream().noneMatch(value -> sameText(value, filter.segmento()))) {
            return false;
        }
        if (!blank(filter.estagio()) && estagios.stream().noneMatch(value -> sameText(value, filter.estagio()))) {
            return false;
        }
        if (!blank(filter.tipo()) && !matchesType(investor.getPerfilRisco(), filter.tipo())) {
            return false;
        }
        return blank(filter.q()) || contains(filter.q(), participantService.displayName(candidate.user()),
                investor.getPerfilRisco(), investor.getRegiaoInteresse(),
                String.join(" ", segmentos), String.join(" ", estagios));
    }

    /** "Investidor Anjo" e "Mentor" incluem quem é "Ambos" (mesma regra das telas). */
    static boolean matchesType(String perfilRisco, String tipo) {
        if (sameText(perfilRisco, tipo)) {
            return true;
        }
        boolean ambos = sameText(perfilRisco, "Ambos");
        return ambos && (sameText(tipo, "Investidor Anjo") || sameText(tipo, "Mentor"));
    }

    static String normalize(String text) {
        if (text == null) {
            return "";
        }
        return Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private static boolean sameText(String a, String b) {
        return normalize(a).equals(normalize(b));
    }

    private static boolean contains(String term, String... fields) {
        String needle = normalize(term);
        for (String field : fields) {
            if (normalize(field).contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static int clampLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    // ============================================================
    // Quem pode ver e ser visto
    // ============================================================

    private Investor requireInvestor(AuthUser authUser) {
        requireRole(authUser, Role.INVESTOR);
        return investorRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "Crie seu perfil de investidor para ver recomendações"));
    }

    private Startup requireStartup(AuthUser authUser) {
        requireRole(authUser, Role.STARTUP);
        return startupRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "Crie seu perfil de startup para ver recomendações"));
    }

    private static void requireRole(AuthUser authUser, Role role) {
        if (authUser == null || authUser.getRole() != role) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Recurso disponível apenas para " + role.name());
        }
    }

    private boolean isActive(Long userId, Role role) {
        User user = participantService.findUser(userId);
        return user != null && user.getRole() == role && participantService.isActive(user);
    }

    /** Perfis cujo usuário está ativo e tem o papel esperado (uma consulta para os usuários). */
    private <P> List<ProfileOf> activeProfiles(List<P> profiles, Function<P, Long> id, Role role) {
        Map<Long, User> users = userRepository.findAllById(profiles.stream().map(id).toList()).stream()
                .filter(user -> user.getRole() == role && participantService.isActive(user))
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return profiles.stream()
                .filter(profile -> users.containsKey(id.apply(profile)))
                .map(profile -> new ProfileOf(users.get(id.apply(profile)), profile))
                .toList();
    }

    private static Map<String, MatchScore> indexByCounterpart(List<MatchScore> scores,
                                                              Function<MatchScore, UUID> counterpart) {
        Map<String, MatchScore> index = new HashMap<>();
        for (MatchScore score : scores) {
            Long counterpartId = ScorecardAccess.userIdOf(counterpart.apply(score));
            if (counterpartId != null && score.getScorePolicy() != null) {
                index.put(key(counterpartId, score.getScorePolicy().getId()), score);
            }
        }
        return index;
    }

    private static String key(Long counterpartId, Long policyId) {
        return counterpartId + ":" + policyId;
    }

    // ============================================================
    // Tipos internos
    // ============================================================

    private record ProfileOf(User user, Object profile) {
    }

    /** Um par startup x investidor; {@code user} é o candidato (o outro lado). */
    private record Candidate(User user, Startup startup, Investor investor) {
        Long counterpartId() {
            return user.getId();
        }
    }

    private record Scored(Candidate candidate, Outcome outcome, String name) {
    }

    /** Score gravado, ou "sem match" por critério eliminatório (não gravado). */
    private record Outcome(MatchScore matchScore, ScorecardRefDto ref, List<FactorDto> criticalFactors) {
        static Outcome stored(MatchScore matchScore) {
            return new Outcome(Objects.requireNonNull(matchScore), null, List.of());
        }

        static Outcome critical(ScorecardRefDto ref, List<FactorDto> factors) {
            return new Outcome(null, ref, factors);
        }

        BigDecimal score() {
            return matchScore == null || matchScore.getTotalScore() == null ? ZERO_SCORE : matchScore.getTotalScore();
        }
    }

    /** Orçamento de cálculos de uma requisição. */
    private static final class Budget {
        private int remaining;

        Budget(int remaining) {
            this.remaining = remaining;
        }

        boolean tryUse() {
            if (remaining <= 0) {
                return false;
            }
            remaining--;
            return true;
        }
    }
}

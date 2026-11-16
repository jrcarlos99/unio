package br.com.unio.matchmaking_backend.communication.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCounterpartResponse;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * D037: com quem o usuário logado pode marcar reunião: usuários ativos do papel
 * complementar que já criaram perfil. Expõe só dados de vitrine do perfil e o nome
 * de exibição do {@link ParticipantService}; nunca e-mail nem documento.
 *
 * <p>O match mútuo ainda não existe no back (D028, D039): a lista não é filtrada por
 * ele. O {@code matchScore} vem do scorecard (só leitura) quando já foi calculado.
 */
@Service
@RequiredArgsConstructor
public class MeetingCounterpartService {

    static final String DEFAULT_INVESTOR_SUBTITLE = "Investidor";

    private final ParticipantService participantService;
    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final MatchScoreRepository matchScoreRepository;

    @Transactional(readOnly = true)
    public List<MeetingCounterpartResponse> list(AuthUser authUser) {
        User me = participantService.requireCommunicatingUser(authUser);
        List<MeetingCounterpartResponse> result = me.getRole() == Role.INVESTOR
                ? startups(me)
                : investors(me);
        return result.stream()
                .sorted(Comparator.comparing(MeetingCounterpartResponse::matchScore,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(MeetingCounterpartResponse::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private List<MeetingCounterpartResponse> startups(User investor) {
        List<Startup> profiles = startupRepository.findAll();
        Map<Long, User> users = activeUsers(profiles.stream().map(Startup::getId), Role.STARTUP);
        // Scorecard usa UUID "Long-encoded" (D018, D025): new UUID(0, userId)
        Map<UUID, BigDecimal> scores = latestScores(
                matchScoreRepository.findByInvestorId(scorecardId(investor.getId())), MatchScore::getStartupId);

        return profiles.stream()
                .filter(profile -> users.containsKey(profile.getId()))
                .map(profile -> new MeetingCounterpartResponse(
                        profile.getId(),
                        participantService.displayName(users.get(profile.getId())),
                        Role.STARTUP.name(),
                        joinNonBlank(profile.getSegmento(), profile.getEstagio()),
                        blankToNull(profile.getSegmento()),
                        blankToNull(profile.getEstagio()),
                        null,
                        null,
                        null,
                        scores.get(scorecardId(profile.getId()))))
                .toList();
    }

    private List<MeetingCounterpartResponse> investors(User startup) {
        List<Investor> profiles = investorRepository.findAll();
        Map<Long, User> users = activeUsers(profiles.stream().map(Investor::getId), Role.INVESTOR);
        Map<UUID, BigDecimal> scores = latestScores(
                matchScoreRepository.findByStartupId(scorecardId(startup.getId())), MatchScore::getInvestorId);

        return profiles.stream()
                .filter(profile -> users.containsKey(profile.getId()))
                .map(profile -> {
                    String tipo = blankToNull(profile.getPerfilRisco());
                    return new MeetingCounterpartResponse(
                            profile.getId(),
                            participantService.displayName(users.get(profile.getId())),
                            Role.INVESTOR.name(),
                            tipo == null ? DEFAULT_INVESTOR_SUBTITLE : tipo,
                            null,
                            null,
                            tipo,
                            profile.getTicketMinimo(),
                            profile.getTicketMaximo(),
                            scores.get(scorecardId(profile.getId())));
                })
                .toList();
    }

    /** Uma consulta para os usuários dos perfis; fica só quem está ativo e tem o papel certo. */
    private Map<Long, User> activeUsers(Stream<Long> ids, Role role) {
        return userRepository.findAllById(ids.toList()).stream()
                .filter(user -> user.getRole() == role && participantService.isActive(user))
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    /** Score mais recente por contraparte (pode haver um por policy). */
    private static Map<UUID, BigDecimal> latestScores(List<MatchScore> scores, Function<MatchScore, UUID> key) {
        Map<UUID, MatchScore> latest = new HashMap<>();
        for (MatchScore score : scores) {
            UUID id = key.apply(score);
            if (id == null || score.getTotalScore() == null) {
                continue;
            }
            latest.merge(id, score, (a, b) -> calculatedAt(b).isAfter(calculatedAt(a)) ? b : a);
        }
        Map<UUID, BigDecimal> result = new HashMap<>();
        latest.forEach((id, score) -> result.put(id, score.getTotalScore()));
        return result;
    }

    private static Instant calculatedAt(MatchScore score) {
        return score.getCalculatedAt() == null ? Instant.EPOCH : score.getCalculatedAt();
    }

    private static UUID scorecardId(Long userId) {
        return new UUID(0L, userId);
    }

    private static String joinNonBlank(String... parts) {
        String joined = Stream.of(parts)
                .map(MeetingCounterpartService::blankToNull)
                .filter(Objects::nonNull)
                .collect(Collectors.joining(" • "));
        return joined.isEmpty() ? "Startup" : joined;
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String stripped = value.strip();
        return stripped.isEmpty() ? null : stripped;
    }
}

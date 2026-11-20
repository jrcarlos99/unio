package br.com.unio.matchmaking_backend.interest.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.service.MeetingService;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.discovery.dto.PublicProfileDto;
import br.com.unio.matchmaking_backend.discovery.service.PublicProfileMapper;
import br.com.unio.matchmaking_backend.interest.dto.ConnectionResponse;
import br.com.unio.matchmaking_backend.interest.dto.ContactDto;
import br.com.unio.matchmaking_backend.interest.dto.InterestResponse;
import br.com.unio.matchmaking_backend.interest.dto.InterestStatus;
import br.com.unio.matchmaking_backend.interest.dto.InterestWithdrawResponse;
import br.com.unio.matchmaking_backend.interest.entity.UserInterest;
import br.com.unio.matchmaking_backend.interest.entity.UserSaved;
import br.com.unio.matchmaking_backend.interest.repository.UserInterestRepository;
import br.com.unio.matchmaking_backend.interest.repository.UserSavedRepository;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScore;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.common.ScorecardAccess;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * D049 a D052: interesse, match mútuo derivado, salvos e contato depois do match.
 *
 * <ul>
 *   <li>Interesse e salvo só entre STARTUP e INVESTOR ativos, com perfil criado.</li>
 *   <li>Match = as duas linhas em user_interests; não há tabela de match.</li>
 *   <li>Retirar o interesse desfaz o match e cancela as reuniões futuras do par.</li>
 *   <li>O e-mail do outro lado só sai em {@link #matches(AuthUser)}.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class InterestService {

    static final String UNMATCH_CANCEL_REASON = "Match desfeito";
    static final String OWN_PROFILE_REQUIRED = "Crie seu perfil antes de demonstrar interesse ou salvar perfis";
    static final String TARGET_NOT_FOUND = "Perfil não encontrado";

    private final UserInterestRepository interestRepository;
    private final UserSavedRepository savedRepository;
    private final ParticipantService participantService;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final MatchScoreRepository matchScoreRepository;
    private final PublicProfileMapper profileMapper;
    private final MeetingService meetingService;

    // ============================================================
    // Interesse e match
    // ============================================================

    /** "Tenho interesse": idempotente. Vira MATCH se o outro lado já tinha demonstrado interesse. */
    @Transactional
    public InterestResponse express(AuthUser authUser, Long targetUserId) {
        User me = requireMeWithProfile(authUser);
        User other = requireCandidate(me, targetUserId);

        interestRepository.insertIfAbsent(me.getId(), other.getId());

        Optional<Instant> matchedAt = matchedAt(me.getId(), other.getId());
        return matchedAt
                .map(when -> new InterestResponse(InterestResponse.MATCH, when))
                .orElseGet(() -> new InterestResponse(InterestResponse.SENT, null));
    }

    /**
     * Retira o interesse. Se havia match, ele deixa de existir e as reuniões futuras
     * (PENDENTE e CONFIRMADA) do par são canceladas (D051).
     */
    @Transactional
    public InterestWithdrawResponse withdraw(AuthUser authUser, Long targetUserId) {
        User me = participantService.requireCommunicatingUser(authUser);
        boolean wasMatch = matchedAt(me.getId(), targetUserId).isPresent();

        interestRepository.deletePair(me.getId(), targetUserId);

        int canceled = wasMatch
                ? meetingService.cancelFutureBetween(me.getId(), targetUserId, UNMATCH_CANCEL_REASON)
                : 0;
        return new InterestWithdrawResponse(statusBetween(me.getId(), targetUserId), canceled);
    }

    /** Meus unios: matches mútuos, do mais recente para o mais antigo, com o e-mail do outro lado. */
    @Transactional(readOnly = true)
    public List<ConnectionResponse> matches(AuthUser authUser) {
        User me = participantService.requireCommunicatingUser(authUser);
        Set<Long> savedIds = savedIdsOf(me.getId());

        List<ConnectionResponse> result = new ArrayList<>();
        for (Long otherId : new HashSet<>(interestRepository.findMatchedUserIds(me.getId()))) {
            User other = activeCandidate(me, otherId);
            if (other == null) {
                continue;
            }
            Instant when = matchedAt(me.getId(), otherId).orElse(null);
            result.add(toConnection(me, other, when, null, InterestStatus.MATCH,
                    savedIds.contains(otherId), new ContactDto(other.getEmail())));
        }
        result.sort(Comparator.comparing(ConnectionResponse::matchedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }

    // ============================================================
    // Salvos
    // ============================================================

    @Transactional
    public void save(AuthUser authUser, Long targetUserId) {
        User me = requireMeWithProfile(authUser);
        User other = requireCandidate(me, targetUserId);
        savedRepository.insertIfAbsent(me.getId(), other.getId());
    }

    @Transactional
    public void unsave(AuthUser authUser, Long targetUserId) {
        User me = participantService.requireCommunicatingUser(authUser);
        savedRepository.deletePair(me.getId(), targetUserId);
    }

    /** Salvos do usuário logado, do mais recente para o mais antigo (sem contato: D052). */
    @Transactional(readOnly = true)
    public List<ConnectionResponse> saved(AuthUser authUser) {
        User me = participantService.requireCommunicatingUser(authUser);
        Map<Long, InterestStatus> statuses = statusesOf(me.getId());

        List<ConnectionResponse> result = new ArrayList<>();
        for (UserSaved saved : savedRepository.findByUserIdOrderByCreatedAtDesc(me.getId())) {
            User other = activeCandidate(me, saved.getTargetUserId());
            if (other == null) {
                continue;
            }
            InterestStatus status = statuses.getOrDefault(other.getId(), InterestStatus.NONE);
            result.add(toConnection(me, other, null, saved.getCreatedAt(), status, true, null));
        }
        return result;
    }

    // ============================================================
    // Consultas usadas pela descoberta
    // ============================================================

    /** Estado do interesse do usuário com cada pessoa com quem há alguma linha. */
    @Transactional(readOnly = true)
    public Map<Long, InterestStatus> statusesOf(Long userId) {
        Set<Long> sent = interestRepository.findByFromUserId(userId).stream()
                .map(UserInterest::getToUserId)
                .collect(Collectors.toSet());
        Set<Long> received = interestRepository.findByToUserId(userId).stream()
                .map(UserInterest::getFromUserId)
                .collect(Collectors.toSet());

        Map<Long, InterestStatus> result = new HashMap<>();
        Set<Long> all = new HashSet<>(sent);
        all.addAll(received);
        for (Long other : all) {
            result.put(other, status(sent.contains(other), received.contains(other)));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Set<Long> savedIdsOf(Long userId) {
        return savedRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(UserSaved::getTargetUserId)
                .collect(Collectors.toSet());
    }

    // ============================================================
    // Internos
    // ============================================================

    private InterestStatus statusBetween(Long me, Long other) {
        return status(interestRepository.existsByFromUserIdAndToUserId(me, other),
                interestRepository.existsByFromUserIdAndToUserId(other, me));
    }

    private static InterestStatus status(boolean sent, boolean received) {
        if (sent && received) {
            return InterestStatus.MATCH;
        }
        if (sent) {
            return InterestStatus.SENT;
        }
        return received ? InterestStatus.RECEIVED : InterestStatus.NONE;
    }

    /** Quando o match aconteceu (o segundo interesse), ou vazio se não há match. */
    private Optional<Instant> matchedAt(Long a, Long b) {
        Optional<UserInterest> ab = interestRepository.findByFromUserIdAndToUserId(a, b);
        Optional<UserInterest> ba = interestRepository.findByFromUserIdAndToUserId(b, a);
        if (ab.isEmpty() || ba.isEmpty()) {
            return Optional.empty();
        }
        Instant first = ab.get().getCreatedAt();
        Instant second = ba.get().getCreatedAt();
        return Optional.of(first.isAfter(second) ? first : second);
    }

    private User requireMeWithProfile(AuthUser authUser) {
        User me = participantService.requireCommunicatingUser(authUser);
        if (!hasProfile(me)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, OWN_PROFILE_REQUIRED);
        }
        return me;
    }

    /** Outro lado válido: existe, ativo, papel complementar (ParticipantService) e com perfil. */
    private User requireCandidate(User me, Long targetUserId) {
        User other = participantService.requireCounterpart(me, targetUserId);
        if (!hasProfile(other)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, TARGET_NOT_FOUND);
        }
        return other;
    }

    /** Como {@link #requireCandidate}, mas devolve null em vez de lançar (listas). */
    private User activeCandidate(User me, Long otherId) {
        User other = participantService.findUser(otherId);
        if (other == null || !participantService.isActive(other)
                || !ParticipantService.complementary(me, other) || !hasProfile(other)) {
            return null;
        }
        return other;
    }

    private boolean hasProfile(User user) {
        return switch (user.getRole()) {
            case STARTUP -> startupRepository.existsById(user.getId());
            case INVESTOR -> investorRepository.existsById(user.getId());
            case ADMIN -> false;
        };
    }

    private ConnectionResponse toConnection(User me, User other, Instant matchedAt, Instant savedAt,
                                            InterestStatus status, boolean saved, ContactDto contact) {
        Optional<MatchScore> score = latestScore(me, other);
        return new ConnectionResponse(
                other.getId(),
                participantService.displayName(other),
                other.getRole().name(),
                matchedAt,
                savedAt,
                score.map(MatchScore::getTotalScore).orElse(null),
                score.map(MatchScore::getClassification).orElse(null),
                status,
                saved,
                profileOf(other),
                contact);
    }

    private PublicProfileDto profileOf(User user) {
        return user.getRole() == Role.STARTUP
                ? startupRepository.findById(user.getId()).map(profileMapper::of).orElse(null)
                : investorRepository.findById(user.getId()).map(profileMapper::of).orElse(null);
    }

    /** Último score já gravado do par (pode haver um por política). Não recalcula. */
    private Optional<MatchScore> latestScore(User me, User other) {
        User investor = me.getRole() == Role.INVESTOR ? me : other;
        User startup = me.getRole() == Role.STARTUP ? me : other;
        return matchScoreRepository.findAllByInvestorIdAndStartupId(
                        ScorecardAccess.scorecardId(investor.getId()),
                        ScorecardAccess.scorecardId(startup.getId()))
                .stream()
                .max(Comparator.comparing(MatchScore::getCalculatedAt,
                        Comparator.nullsFirst(Comparator.naturalOrder())));
    }
}

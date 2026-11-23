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
import br.com.unio.matchmaking_backend.interest.dto.ReceivedInterestCountResponse;
import br.com.unio.matchmaking_backend.interest.dto.ReceivedInterestPageResponse;
import br.com.unio.matchmaking_backend.interest.dto.ReceivedInterestResponse;
import br.com.unio.matchmaking_backend.interest.entity.UserSaved;
import br.com.unio.matchmaking_backend.interest.repository.UserSavedRepository;
import br.com.unio.matchmaking_backend.match.entity.MatchInterest;
import br.com.unio.matchmaking_backend.match.repository.MatchInterestRepository;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
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
 * <p>D058: é a única implementação de interesse e match. Grava em match_interests (V23),
 * a mesma tabela das rotas /api/matches do main, que delegam a este service
 * ({@code MatchInterestService}).
 *
 * <ul>
 *   <li>Interesse e salvo só entre STARTUP e INVESTOR ativos, com perfil criado.</li>
 *   <li>Match = as duas linhas ativas do par em match_interests (o status MATCHED é mantido em dia).</li>
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
    static final int DEFAULT_RECEIVED_LIMIT = 20;
    static final int MAX_RECEIVED_LIMIT = 100;

    private final MatchInterestRepository interestRepository;
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

        interestRepository.insertIfAbsent(startupIdOf(me, other), investorIdOf(me, other), me.getId());
        interestRepository.syncPairStatus(me.getId(), other.getId());

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
        interestRepository.syncPairStatus(me.getId(), targetUserId);

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
    // Interesses recebidos (D065)
    // ============================================================

    /**
     * Interesses que outras pessoas demonstraram no usuário e que ele ainda não retribuiu, do
     * mais recente para o mais antigo. Só contas ativas (moderação D063 e exclusão de conta) e
     * com perfil, como nas outras listas. Sem contato (D052).
     */
    @Transactional(readOnly = true)
    public ReceivedInterestPageResponse received(AuthUser authUser, Integer limit, Integer offset) {
        User me = participantService.requireCommunicatingUser(authUser);
        List<PendingReceived> pending = pendingReceived(me);

        int pageLimit = limit == null || limit <= 0 ? DEFAULT_RECEIVED_LIMIT : Math.min(limit, MAX_RECEIVED_LIMIT);
        int pageOffset = offset == null ? 0 : Math.max(0, offset);
        List<ReceivedInterestResponse> items = pending.stream()
                .skip(pageOffset)
                .limit(pageLimit)
                .map(item -> toReceived(me, item))
                .toList();
        return new ReceivedInterestPageResponse(pending.size(), pageLimit, pageOffset, items);
    }

    /** Mesmo total de {@link #received}, sem montar os itens (sino do front). */
    @Transactional(readOnly = true)
    public ReceivedInterestCountResponse receivedCount(AuthUser authUser) {
        User me = participantService.requireCommunicatingUser(authUser);
        return new ReceivedInterestCountResponse(pendingReceived(me).size());
    }

    private List<PendingReceived> pendingReceived(User me) {
        Set<Long> sentTo = interestRepository.findActiveSentBy(me.getId()).stream()
                .map(row -> otherSide(row, me.getId()))
                .collect(Collectors.toSet());

        List<PendingReceived> result = new ArrayList<>();
        for (MatchInterest row : interestRepository.findActiveReceivedBy(me.getId())) {
            Long likerId = row.getLikedByUserId();
            if (sentTo.contains(likerId)) {
                continue;
            }
            User other = activeCandidate(me, likerId);
            if (other != null) {
                result.add(new PendingReceived(other, row));
            }
        }
        result.sort(Comparator.comparing((PendingReceived item) -> item.row().getCreatedAt(),
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(item -> item.row().getId(), Comparator.reverseOrder()));
        return result;
    }

    private ReceivedInterestResponse toReceived(User me, PendingReceived item) {
        User other = item.user();
        Optional<MatchScore> score = latestScore(me, other);
        String segmento;
        String estagio;
        String localizacao;
        if (other.getRole() == Role.STARTUP) {
            Startup startup = startupRepository.findById(other.getId()).orElse(null);
            segmento = startup == null ? null : startup.getSegmento();
            estagio = startup == null ? null : startup.getEstagio();
            localizacao = startup == null ? null : startup.getLocalizacao();
        } else {
            PublicProfileDto investor = investorRepository.findById(other.getId())
                    .map(profileMapper::of).orElse(null);
            segmento = investor == null ? null : joined(investor.segmentosInteresse());
            estagio = investor == null ? null : joined(investor.estagiosInteresse());
            localizacao = investor == null ? null : investor.regiaoInteresse();
        }
        return new ReceivedInterestResponse(
                other.getId(),
                participantService.displayName(other),
                other.getRole().name(),
                segmento,
                estagio,
                localizacao,
                score.map(MatchScore::getTotalScore).orElse(null),
                score.map(MatchScore::getClassification).orElse(null),
                item.row().getCreatedAt());
    }

    /** Segmentos ou estágios do investidor numa linha: "Logística, Fintech" (null se vazio). */
    private static String joined(List<String> values) {
        return values == null || values.isEmpty() ? null : String.join(", ", values);
    }

    private record PendingReceived(User user, MatchInterest row) {
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
        Set<Long> sent = interestRepository.findActiveSentBy(userId).stream()
                .map(interest -> otherSide(interest, userId))
                .collect(Collectors.toSet());
        Set<Long> received = interestRepository.findActiveReceivedBy(userId).stream()
                .map(MatchInterest::getLikedByUserId)
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
    // Rotas /api/matches do main (D058): mesmas regras, formato de linha
    // ============================================================

    /**
     * Linhas do usuário logado (as que ele mesmo curtiu) cujo par já tem match mútuo, da mais
     * recente para a mais antiga. Só pares com outro lado ativo, como em {@link #matches}.
     */
    @Transactional(readOnly = true)
    public List<MatchInterest> matchedRowsOf(AuthUser authUser) {
        User me = participantService.requireCommunicatingUser(authUser);
        Set<Long> matched = new HashSet<>(interestRepository.findMatchedUserIds(me.getId()));
        return sentRowsWithActiveCounterpart(me).stream()
                .filter(row -> matched.contains(otherSide(row, me.getId())))
                .toList();
    }

    /** Linhas que o usuário curtiu e que ainda não viraram match (status SENT na descoberta). */
    @Transactional(readOnly = true)
    public List<MatchInterest> pendingSentRowsOf(AuthUser authUser) {
        User me = participantService.requireCommunicatingUser(authUser);
        Set<Long> matched = new HashSet<>(interestRepository.findMatchedUserIds(me.getId()));
        return sentRowsWithActiveCounterpart(me).stream()
                .filter(row -> !matched.contains(otherSide(row, me.getId())))
                .toList();
    }

    private List<MatchInterest> sentRowsWithActiveCounterpart(User me) {
        return interestRepository.findActiveSentBy(me.getId()).stream()
                .filter(row -> activeCandidate(me, otherSide(row, me.getId())) != null)
                .toList();
    }

    /** O outro lado do par de uma linha, visto por {@code userId}. */
    public static Long otherSide(MatchInterest interest, Long userId) {
        return userId.equals(interest.getStartupId()) ? interest.getInvestorId() : interest.getStartupId();
    }

    private static Long startupIdOf(User a, User b) {
        return a.getRole() == Role.STARTUP ? a.getId() : b.getId();
    }

    private static Long investorIdOf(User a, User b) {
        return a.getRole() == Role.INVESTOR ? a.getId() : b.getId();
    }

    // ============================================================
    // Internos
    // ============================================================

    private InterestStatus statusBetween(Long me, Long other) {
        return status(interestRepository.existsActive(me, other),
                interestRepository.existsActive(other, me));
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
        Optional<MatchInterest> ab = interestRepository.findActive(a, b);
        Optional<MatchInterest> ba = interestRepository.findActive(b, a);
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

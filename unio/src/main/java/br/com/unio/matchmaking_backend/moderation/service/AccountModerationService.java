package br.com.unio.matchmaking_backend.moderation.service;

import br.com.unio.matchmaking_backend.audit.service.AuditService;
import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.service.MeetingService;
import br.com.unio.matchmaking_backend.moderation.dto.AccountModerationItem;
import br.com.unio.matchmaking_backend.moderation.dto.ModerationPage;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModeration;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModerationStatus;
import br.com.unio.matchmaking_backend.moderation.repository.AccountModerationRepository;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * D063 (RF08, RNF10): moderação de cadastros pelo ADMIN.
 *
 * <ul>
 *   <li>Sem registro de moderação, a conta vale APROVADO (contas antigas seguem iguais).</li>
 *   <li>RECUSADO e SUSPENSO: login 403 ({@link AccountModerationGate}) e conta fora da
 *       descoberta, dos perfis públicos e das contrapartes ({@link AccountVisibility}).</li>
 *   <li>Recusar cancela as reuniões futuras da conta com o cancelamento que já existe
 *       ({@code MeetingService.cancelFutureBetween}). Suspender não cancela.</li>
 *   <li>Matches, reuniões e mensagens nunca são apagados; reaprovar ou reativar volta tudo.</li>
 *   <li>O ADMIN não modera a si mesmo (400) nem outro ADMIN (403). Repetir o estado atual
 *       responde 200 sem mudar nada.</li>
 *   <li>Toda ação vai para o log de auditoria existente ({@link AuditService}).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class AccountModerationService {

    static final int DEFAULT_LIMIT = 20;
    static final int MAX_LIMIT = 100;
    static final String USER_NOT_FOUND = "Usuário não encontrado";
    static final String SELF_MODERATION = "Você não pode moderar a própria conta";
    static final String ADMIN_TARGET = "A conta de um administrador não pode ser moderada";
    static final String DELETED_TARGET = "A conta foi excluída pelo titular e não pode ser moderada";
    static final String INVALID_ROLE = "Perfil inválido: use STARTUP ou INVESTOR";
    static final String MEETING_CANCEL_REASON = "Reunião cancelada porque a conta foi recusada pela moderação";

    private static final Set<Role> MODERATABLE_ROLES = EnumSet.of(Role.STARTUP, Role.INVESTOR);

    /** Ordem padrão da lista: quem espera decisão primeiro. */
    private static final List<AccountModerationStatus> STATUS_ORDER = List.of(
            AccountModerationStatus.PENDENTE,
            AccountModerationStatus.SUSPENSO,
            AccountModerationStatus.RECUSADO,
            AccountModerationStatus.APROVADO);

    private final AccountModerationRepository moderationRepository;
    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final MeetingRepository meetingRepository;
    private final MeetingService meetingService;
    private final AuditService auditService;
    private final AccountVisibility visibility;

    // ============================================================
    // Lista
    // ============================================================

    @Transactional(readOnly = true)
    public ModerationPage<AccountModerationItem> list(Collection<AccountModerationStatus> statuses, Role role,
                                                      String q, Integer limit, Integer offset) {
        Set<Role> roles = rolesFor(role);
        String term = q == null ? "" : q.strip().toLowerCase(Locale.ROOT);

        List<User> users = moderationRepository.findModeratableUsers(roles);
        List<Long> ids = users.stream().map(User::getId).toList();
        Map<Long, AccountModeration> moderation = moderationRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(AccountModeration::getUserId, Function.identity()));
        Map<Long, String> startupNames = startupRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Startup::getId, startup -> Objects.toString(startup.getNome(), "")));
        Set<Long> investorIds = investorRepository.findAllById(ids).stream()
                .map(Investor::getId)
                .collect(Collectors.toSet());

        List<Row> filtered = users.stream()
                .filter(user -> term.isEmpty() || matches(term, user, startupNames.get(user.getId())))
                .map(user -> new Row(user, moderation.get(user.getId())))
                .filter(row -> statuses == null || statuses.isEmpty() || statuses.contains(row.status()))
                .sorted(Comparator.comparingInt((Row row) -> STATUS_ORDER.indexOf(row.status()))
                        .thenComparing(row -> row.user().getCreatedAt(), Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(row -> row.user().getId(), Comparator.reverseOrder()))
                .toList();

        int safeLimit = clampLimit(limit);
        int safeOffset = Math.max(0, offset == null ? 0 : offset);
        List<Row> page = filtered.stream().skip(safeOffset).limit(safeLimit).toList();
        Map<Long, String> reviewers = reviewerEmails(page.stream().map(Row::moderation).toList());
        List<AccountModerationItem> items = page.stream()
                .map(row -> toItem(row.user(), row.moderation(), startupNames, investorIds, reviewers))
                .toList();
        return new ModerationPage<>(filtered.size(), safeLimit, safeOffset, items);
    }

    // ============================================================
    // Ações
    // ============================================================

    @Transactional
    public AccountModerationItem approve(AuthUser admin, Long userId) {
        return transition(admin, userId, AccountModerationStatus.APROVADO, null, ModerationActions.ACCOUNT_APPROVED);
    }

    @Transactional
    public AccountModerationItem reject(AuthUser admin, Long userId, String reason) {
        return transition(admin, userId, AccountModerationStatus.RECUSADO,
                ModerationActions.requireReason(reason), ModerationActions.ACCOUNT_REJECTED);
    }

    @Transactional
    public AccountModerationItem suspend(AuthUser admin, Long userId, String reason) {
        return transition(admin, userId, AccountModerationStatus.SUSPENSO,
                ModerationActions.requireReason(reason), ModerationActions.ACCOUNT_SUSPENDED);
    }

    @Transactional
    public AccountModerationItem reactivate(AuthUser admin, Long userId) {
        return transition(admin, userId, AccountModerationStatus.APROVADO, null,
                ModerationActions.ACCOUNT_REACTIVATED);
    }

    private AccountModerationItem transition(AuthUser admin, Long userId, AccountModerationStatus target,
                                             String reason, String action) {
        User user = requireModeratable(admin, userId);
        AccountModeration current = moderationRepository.findById(userId).orElse(null);
        AccountModerationStatus previous = current == null ? AccountModerationStatus.APROVADO : current.getStatus();

        AccountModeration saved = current;
        int canceledMeetings = 0;
        if (previous != target) {
            AccountModeration row = current != null ? current : AccountModeration.builder().userId(userId).build();
            row.setStatus(target);
            row.setReason(reason);
            row.setReviewedByUserId(admin.getId());
            row.setReviewedAt(Instant.now());
            saved = moderationRepository.save(row);
            visibility.invalidate();
            if (target == AccountModerationStatus.RECUSADO) {
                canceledMeetings = cancelFutureMeetings(userId);
            }
        }

        auditService.log(admin.getEmail(), action, ModerationActions.ENTITY_USER, String.valueOf(userId),
                details(previous, target, reason, canceledMeetings));

        Map<Long, String> startupNames = startupRepository.findById(userId)
                .map(startup -> Map.of(startup.getId(), Objects.toString(startup.getNome(), "")))
                .orElse(Map.of());
        Set<Long> investorIds = investorRepository.existsById(userId) ? Set.of(userId) : Set.of();
        return toItem(user, saved, startupNames, investorIds, reviewerEmails(Collections.singletonList(saved)));
    }

    /** 404, depois 400 (a si mesmo), 403 (outro ADMIN) e 409 (conta excluída). */
    private User requireModeratable(AuthUser admin, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, USER_NOT_FOUND));
        if (Objects.equals(admin.getId(), userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, SELF_MODERATION);
        }
        if (user.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ADMIN_TARGET);
        }
        if (user.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, DELETED_TARGET);
        }
        return user;
    }

    /** Reaproveita o cancelamento do D051 para cada pessoa com quem a conta tem reunião ativa. */
    private int cancelFutureMeetings(Long userId) {
        Set<Long> counterparts = meetingRepository.findAllByParticipant(userId).stream()
                .filter(meeting -> meeting.getStatus().isActive())
                .map(meeting -> otherId(meeting, userId))
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        int canceled = 0;
        for (Long other : counterparts) {
            canceled += meetingService.cancelFutureBetween(userId, other, MEETING_CANCEL_REASON);
        }
        return canceled;
    }

    private static Long otherId(Meeting meeting, Long userId) {
        User other = meeting.otherParticipant(userId);
        return other == null ? null : other.getId();
    }

    /** Texto do log: sem senha, sem e-mail da conta moderada, só situação, motivo e efeitos. */
    static String details(AccountModerationStatus previous, AccountModerationStatus target, String reason,
                          int canceledMeetings) {
        StringBuilder text = new StringBuilder();
        if (previous == target) {
            text.append("Situação mantida: ").append(target).append(" (sem alteração).");
        } else {
            text.append("Situação anterior: ").append(previous).append(". Nova situação: ").append(target).append('.');
        }
        if (reason != null) {
            text.append(" Motivo: ").append(reason).append('.');
        }
        if (canceledMeetings > 0) {
            text.append(" Reuniões futuras canceladas: ").append(canceledMeetings).append('.');
        }
        return text.toString();
    }

    // ============================================================
    // Montagem
    // ============================================================

    private static Set<Role> rolesFor(Role role) {
        if (role == null) {
            return MODERATABLE_ROLES;
        }
        if (!MODERATABLE_ROLES.contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_ROLE);
        }
        return EnumSet.of(role);
    }

    private static boolean matches(String term, User user, String startupName) {
        return contains(user.getEmail(), term) || contains(startupName, term);
    }

    private static boolean contains(String value, String term) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(term);
    }

    private static int clampLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    private static AccountModerationItem toItem(User user, AccountModeration moderation, Map<Long, String> startupNames,
                                                Set<Long> investorIds, Map<Long, String> reviewerEmails) {
        AccountModerationStatus status = moderation == null ? AccountModerationStatus.APROVADO : moderation.getStatus();
        String nome = startupNames.get(user.getId());
        Long reviewer = moderation == null ? null : moderation.getReviewedByUserId();
        return new AccountModerationItem(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                nome == null || nome.isBlank() ? null : nome,
                status,
                moderation == null ? null : moderation.getReason(),
                reviewer == null ? null : reviewerEmails.get(reviewer),
                moderation == null ? null : moderation.getReviewedAt(),
                user.getCreatedAt(),
                startupNames.containsKey(user.getId()) || investorIds.contains(user.getId()));
    }

    /** Uma consulta para os e-mails dos administradores que decidiram. */
    private Map<Long, String> reviewerEmails(List<AccountModeration> rows) {
        Set<Long> ids = rows.stream()
                .filter(Objects::nonNull)
                .map(AccountModeration::getReviewedByUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getEmail));
    }

    private record Row(User user, AccountModeration moderation) {
        AccountModerationStatus status() {
            return moderation == null ? AccountModerationStatus.APROVADO : moderation.getStatus();
        }
    }
}

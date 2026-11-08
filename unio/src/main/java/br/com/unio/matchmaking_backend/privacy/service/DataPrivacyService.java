package br.com.unio.matchmaking_backend.privacy.service;

import br.com.unio.matchmaking_backend.audit.entity.AuditLog;
import br.com.unio.matchmaking_backend.audit.repository.AuditLogRepository;
import br.com.unio.matchmaking_backend.audit.service.AuditService;
import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.PasswordResetTokenRepository;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.entity.Conversation;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.entity.Message;
import br.com.unio.matchmaking_backend.communication.repository.ConversationRepository;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.repository.MessageRepository;
import br.com.unio.matchmaking_backend.consent.repository.ConsentRecordRepository;
import br.com.unio.matchmaking_backend.onboarding.repository.UserOnboardingRepository;
import br.com.unio.matchmaking_backend.onboarding.service.OnboardingService;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.profile.service.ProfileService;
import br.com.unio.matchmaking_backend.review.entity.InteractionReview;
import br.com.unio.matchmaking_backend.review.repository.InteractionReviewRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.explanation.MatchScoreFactorRepository;
import br.com.unio.matchmaking_backend.scorecard.feedback.FeedbackEventRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * T13 (RNF03 / LGPD, depende do T08) — direitos do titular:
 * <ul>
 *   <li>portabilidade/acesso: exportação de todos os dados do usuário em JSON;</li>
 *   <li>eliminação: exclusão da conta por anonimização (ver D029 em docs/decisoes.md).</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataPrivacyService {

    static final String REMOVED_MESSAGE = "[mensagem removida a pedido do titular]";
    static final String ACCOUNT_REMOVED_REASON = "Conta do participante removida";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProfileService profileService;
    private final OnboardingService onboardingService;
    private final UserOnboardingRepository onboardingRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final ConsentRecordRepository consentRecordRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MeetingRepository meetingRepository;
    private final InteractionReviewRepository reviewRepository;
    private final MatchScoreFactorRepository matchScoreFactorRepository;
    private final MatchScoreRepository matchScoreRepository;
    private final FeedbackEventRepository feedbackEventRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;

    @Value("${app.upload.dir:./uploads/pitch/}")
    private String uploadDirectory;

    // ============================================================
    // Exportação (portabilidade / acesso)
    // ============================================================

    @Transactional(readOnly = true)
    public Map<String, Object> export(AuthUser authUser) {
        User user = requireActiveUser(authUser);

        Map<String, Object> export = new LinkedHashMap<>();
        export.put("exportedAt", Instant.now());
        export.put("account", accountData(user));
        export.put("consent", consentData(user));
        export.put("profile", profileData(authUser));
        export.put("onboarding", onboardingData(authUser));
        export.put("conversations", conversationsData(user));
        export.put("meetings", meetingsData(user));
        export.put("reviewsWritten", reviewsData(reviewRepository.findByReviewerIdOrderByCreatedAtDesc(user.getId())));
        export.put("reviewsReceived", reviewsData(reviewRepository.findByReviewedIdOrderByCreatedAtDesc(user.getId())));
        export.put("auditLog", auditData(user));
        return export;
    }

    // ============================================================
    // Exclusão (eliminação por anonimização)
    // ============================================================

    /**
     * Exclui a conta do titular. Exige a senha atual como confirmação.
     * Dados de perfil são apagados; registros compartilhados com outra pessoa
     * (mensagens, reuniões, avaliações) ficam, mas sem conteúdo pessoal do titular.
     */
    @Transactional
    public void deleteAccount(AuthUser authUser, String password) {
        User user = requireActiveUser(authUser);

        if (user.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Contas de administrador não podem ser excluídas por este fluxo");
        }
        if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Senha incorreta");
        }

        Long userId = user.getId();
        Instant now = Instant.now();

        deletePitchFile(userId);
        startupRepository.findById(userId).ifPresent(startupRepository::delete);
        investorRepository.findById(userId).ifPresent(investorRepository::delete);
        onboardingRepository.findById(userId).ifPresent(onboardingRepository::delete);
        passwordResetTokenRepository.deleteByUser(user);

        consentRecordRepository.findByUserId(userId).ifPresent(consent -> {
            if (consent.getRevokedAt() == null) {
                consent.setRevokedAt(now);
                consentRecordRepository.save(consent);
            }
        });

        messageRepository.replaceContentSentBy(userId, REMOVED_MESSAGE);
        reviewRepository.clearCommentsWrittenBy(userId);
        cancelActiveMeetings(userId);

        // Scorecard usa UUID "Long-encoded" (D018): new UUID(0, userId)
        UUID scorecardId = new UUID(0L, userId);
        matchScoreFactorRepository.deleteByParticipant(scorecardId);
        matchScoreRepository.deleteByParticipant(scorecardId);
        feedbackEventRepository.deleteByParticipant(scorecardId);

        user.setEmail("removido-" + userId + "@unio.invalid");
        user.setDocumento(null);
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setDeletedAt(now);
        userRepository.save(user);

        // Sem e-mail original no log: o registro guarda só o id interno (base: segurança/obrigação legal)
        auditService.log("user:" + userId, "ACCOUNT_DELETED", "User", String.valueOf(userId),
                "Conta anonimizada a pedido do titular (LGPD)");
    }

    // ============================================================
    // Internos
    // ============================================================

    private User requireActiveUser(AuthUser authUser) {
        User user = userRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
        if (user.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado");
        }
        return user;
    }

    private void cancelActiveMeetings(Long userId) {
        for (Meeting meeting : meetingRepository.findAllByParticipant(userId)) {
            if (meeting.getStatus() == MeetingStatus.PENDENTE || meeting.getStatus() == MeetingStatus.CONFIRMADA) {
                meeting.setStatus(MeetingStatus.CANCELADA);
                meeting.setCancelReason(ACCOUNT_REMOVED_REASON);
                meetingRepository.save(meeting);
            }
        }
    }

    private void deletePitchFile(Long userId) {
        String pitchUrl = startupRepository.findById(userId).map(Startup::getPitchFileUrl).orElse(null);
        if (pitchUrl == null || pitchUrl.isBlank()) {
            return;
        }
        try {
            Path file = Paths.get(uploadDirectory).resolve(Paths.get(pitchUrl).getFileName().toString());
            Files.deleteIfExists(file);
        } catch (IOException | RuntimeException exception) {
            // Não impede a exclusão da conta; o arquivo fica para limpeza manual
            log.warn("Não foi possível apagar o pitch do usuário {}: {}", userId, exception.getMessage());
        }
    }

    private Map<String, Object> accountData(User user) {
        Map<String, Object> account = new LinkedHashMap<>();
        account.put("id", user.getId());
        account.put("email", user.getEmail());
        account.put("documento", user.getDocumento());
        account.put("role", user.getRole().name());
        account.put("createdAt", user.getCreatedAt());
        return account;
    }

    private Map<String, Object> consentData(User user) {
        return consentRecordRepository.findByUserId(user.getId())
                .map(consent -> {
                    Map<String, Object> data = new LinkedHashMap<>();
                    data.put("acceptedTerms", consent.isAcceptedTerms());
                    data.put("acceptedAt", consent.getAcceptedAt());
                    data.put("revokedAt", consent.getRevokedAt());
                    return data;
                })
                .orElse(null);
    }

    private Map<String, Object> profileData(AuthUser authUser) {
        if (authUser.getRole() == Role.ADMIN) {
            return null;
        }
        try {
            return profileService.getCurrentProfile(authUser);
        } catch (ResponseStatusException notFound) {
            return null; // usuário ainda não criou o perfil
        }
    }

    private Map<String, Object> onboardingData(AuthUser authUser) {
        if (authUser.getRole() == Role.ADMIN) {
            return null;
        }
        return onboardingService.get(authUser);
    }

    private List<Map<String, Object>> conversationsData(User user) {
        return conversationRepository.findAllByParticipant(user.getId()).stream()
                .map(conversation -> conversationData(conversation, user.getId()))
                .toList();
    }

    private Map<String, Object> conversationData(Conversation conversation, Long userId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", conversation.getId());
        data.put("participantId", conversation.otherParticipant(userId).getId());
        data.put("createdAt", conversation.getCreatedAt());
        data.put("messages", messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream()
                .map(message -> messageData(message, userId))
                .toList());
        return data;
    }

    private Map<String, Object> messageData(Message message, Long userId) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", message.getId());
        data.put("sentByMe", message.getSender().getId().equals(userId));
        data.put("content", message.getContent());
        data.put("createdAt", message.getCreatedAt());
        data.put("readAt", message.getReadAt());
        return data;
    }

    private List<Map<String, Object>> meetingsData(User user) {
        return meetingRepository.findAllByParticipant(user.getId()).stream()
                .map(meeting -> {
                    Map<String, Object> data = new LinkedHashMap<>();
                    data.put("id", meeting.getId());
                    data.put("organizer", meeting.isOrganizer(user.getId()));
                    data.put("participantId", meeting.otherParticipant(user.getId()).getId());
                    data.put("title", meeting.getTitle());
                    data.put("agenda", meeting.getAgenda());
                    data.put("startsAt", meeting.getStartsAt());
                    data.put("endsAt", meeting.getEndsAt());
                    data.put("meetingUrl", meeting.getMeetingUrl());
                    data.put("status", meeting.getStatus().name());
                    data.put("cancelReason", meeting.getCancelReason());
                    return data;
                })
                .toList();
    }

    private List<Map<String, Object>> reviewsData(List<InteractionReview> reviews) {
        return reviews.stream()
                .map(review -> {
                    Map<String, Object> data = new LinkedHashMap<>();
                    data.put("id", review.getId());
                    data.put("meetingId", review.getMeeting().getId());
                    data.put("reviewerId", review.getReviewer().getId());
                    data.put("reviewedId", review.getReviewed().getId());
                    data.put("rating", review.getRating());
                    data.put("comment", review.getComment());
                    data.put("createdAt", review.getCreatedAt());
                    return data;
                })
                .toList();
    }

    private List<Map<String, Object>> auditData(User user) {
        return auditLogRepository.findByActorEmailOrderByCreatedAtDesc(user.getEmail()).stream()
                .map(this::auditEntry)
                .toList();
    }

    private Map<String, Object> auditEntry(AuditLog auditLog) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("action", auditLog.getAction());
        data.put("entityType", auditLog.getEntityType());
        data.put("createdAt", auditLog.getCreatedAt());
        return data;
    }
}

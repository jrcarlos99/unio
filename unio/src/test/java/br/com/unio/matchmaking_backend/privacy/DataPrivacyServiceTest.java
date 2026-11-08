package br.com.unio.matchmaking_backend.privacy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.audit.repository.AuditLogRepository;
import br.com.unio.matchmaking_backend.audit.service.AuditService;
import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.PasswordResetTokenRepository;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.repository.ConversationRepository;
import br.com.unio.matchmaking_backend.communication.repository.MeetingRepository;
import br.com.unio.matchmaking_backend.communication.repository.MessageRepository;
import br.com.unio.matchmaking_backend.consent.entity.ConsentRecord;
import br.com.unio.matchmaking_backend.consent.repository.ConsentRecordRepository;
import br.com.unio.matchmaking_backend.onboarding.repository.UserOnboardingRepository;
import br.com.unio.matchmaking_backend.onboarding.service.OnboardingService;
import br.com.unio.matchmaking_backend.privacy.service.DataPrivacyService;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.profile.service.ProfileService;
import br.com.unio.matchmaking_backend.review.repository.InteractionReviewRepository;
import br.com.unio.matchmaking_backend.scorecard.calculation.MatchScoreRepository;
import br.com.unio.matchmaking_backend.scorecard.explanation.MatchScoreFactorRepository;
import br.com.unio.matchmaking_backend.scorecard.feedback.FeedbackEventRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DataPrivacyServiceTest {

    @Mock private UserRepository userRepository;
    @Spy private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    @Mock private ProfileService profileService;
    @Mock private OnboardingService onboardingService;
    @Mock private UserOnboardingRepository onboardingRepository;
    @Mock private StartupRepository startupRepository;
    @Mock private InvestorRepository investorRepository;
    @Mock private ConsentRecordRepository consentRecordRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private ConversationRepository conversationRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private MeetingRepository meetingRepository;
    @Mock private InteractionReviewRepository reviewRepository;
    @Mock private MatchScoreFactorRepository matchScoreFactorRepository;
    @Mock private MatchScoreRepository matchScoreRepository;
    @Mock private FeedbackEventRepository feedbackEventRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private AuditService auditService;

    @InjectMocks
    private DataPrivacyService service;

    private User startup;

    @BeforeEach
    void setUp() {
        startup = User.builder()
                .id(1L)
                .role(Role.STARTUP)
                .email("fundadora@startup.com")
                .documento("12345678901")
                .passwordHash(new BCryptPasswordEncoder().encode("senhaCerta123"))
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(startup));
        when(startupRepository.findById(1L)).thenReturn(Optional.empty());
        when(investorRepository.findById(1L)).thenReturn(Optional.empty());
        when(onboardingRepository.findById(1L)).thenReturn(Optional.empty());
        when(consentRecordRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(meetingRepository.findAllByParticipant(1L)).thenReturn(List.of());
        when(conversationRepository.findAllByParticipant(1L)).thenReturn(List.of());
    }

    @Test
    void senhaErradaNaoExcluiNada() {
        assertThatThrownBy(() -> service.deleteAccount(new AuthUser(startup), "errada"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        verify(userRepository, never()).save(any());
        verify(messageRepository, never()).replaceContentSentBy(any(), anyString());
    }

    @Test
    void adminNaoPodeSeExcluirPorEsteFluxo() {
        User admin = User.builder().id(9L).role(Role.ADMIN).email("admin@unio.com")
                .passwordHash(new BCryptPasswordEncoder().encode("senhaCerta123")).build();
        when(userRepository.findById(9L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.deleteAccount(new AuthUser(admin), "senhaCerta123"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void exclusaoAnonimizaContaELimpaDadosRelacionados() {
        String originalHash = startup.getPasswordHash();
        ConsentRecord consent = ConsentRecord.builder().id(1L).user(startup).acceptedTerms(true)
                .acceptedAt(Instant.now()).build();
        when(consentRecordRepository.findByUserId(1L)).thenReturn(Optional.of(consent));

        Meeting pending = Meeting.builder().id(3L).organizer(startup)
                .invitee(User.builder().id(2L).role(Role.INVESTOR).email("a@b.com").passwordHash("x").build())
                .title("Call").status(MeetingStatus.PENDENTE)
                .startsAt(Instant.now().plusSeconds(3600)).endsAt(Instant.now().plusSeconds(5400)).build();
        when(meetingRepository.findAllByParticipant(1L)).thenReturn(List.of(pending));

        service.deleteAccount(new AuthUser(startup), "senhaCerta123");

        assertThat(startup.isDeleted()).isTrue();
        assertThat(startup.getEmail()).isEqualTo("removido-1@unio.invalid");
        assertThat(startup.getDocumento()).isNull();
        assertThat(startup.getPasswordHash()).isNotEqualTo(originalHash);
        assertThat(consent.getRevokedAt()).isNotNull();
        assertThat(pending.getStatus()).isEqualTo(MeetingStatus.CANCELADA);

        UUID scorecardId = new UUID(0L, 1L);
        verify(messageRepository).replaceContentSentBy(eq(1L), anyString());
        verify(reviewRepository).clearCommentsWrittenBy(1L);
        verify(matchScoreFactorRepository).deleteByParticipant(scorecardId);
        verify(matchScoreRepository).deleteByParticipant(scorecardId);
        verify(feedbackEventRepository).deleteByParticipant(scorecardId);
        verify(passwordResetTokenRepository).deleteByUser(startup);
        verify(auditService).log(eq("user:1"), eq("ACCOUNT_DELETED"), eq("User"), eq("1"), anyString());
    }

    @Test
    void contaJaExcluidaNaoExporta() {
        startup.setDeletedAt(Instant.now());

        assertThatThrownBy(() -> service.export(new AuthUser(startup)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void exportTrazTodasAsSecoesSemSenha() {
        when(profileService.getCurrentProfile(any())).thenThrow(
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil Startup não encontrado"));
        when(onboardingService.get(any())).thenReturn(Map.of("status", "PENDENTE"));

        Map<String, Object> export = service.export(new AuthUser(startup));

        assertThat(export).containsKeys("exportedAt", "account", "consent", "profile", "onboarding",
                "conversations", "meetings", "reviewsWritten", "reviewsReceived", "auditLog");
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) export.get("account");
        assertThat(account).containsEntry("email", "fundadora@startup.com")
                .containsEntry("documento", "12345678901")
                .doesNotContainKey("passwordHash");
        assertThat(export.get("profile")).isNull();
    }
}

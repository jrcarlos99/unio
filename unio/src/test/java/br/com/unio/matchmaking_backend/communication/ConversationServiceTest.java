package br.com.unio.matchmaking_backend.communication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.ConversationResponse;
import br.com.unio.matchmaking_backend.communication.dto.MessageResponse;
import br.com.unio.matchmaking_backend.communication.entity.Conversation;
import br.com.unio.matchmaking_backend.communication.entity.Message;
import br.com.unio.matchmaking_backend.communication.repository.ConversationRepository;
import br.com.unio.matchmaking_backend.communication.repository.MessageRepository;
import br.com.unio.matchmaking_backend.communication.service.ConversationService;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ConversationServiceTest {

    private ConversationRepository conversationRepository;
    private MessageRepository messageRepository;
    private UserRepository userRepository;
    private ConversationService service;

    private User startup;
    private User investor;
    private User otherStartup;

    @BeforeEach
    void setUp() {
        conversationRepository = mock(ConversationRepository.class);
        messageRepository = mock(MessageRepository.class);
        userRepository = mock(UserRepository.class);
        StartupRepository startupRepository = mock(StartupRepository.class);
        ParticipantService participantService = new ParticipantService(userRepository, startupRepository);
        service = new ConversationService(conversationRepository, messageRepository, participantService);

        startup = user(1L, Role.STARTUP, "startup@unio.com");
        investor = user(2L, Role.INVESTOR, "anjo@unio.com");
        otherStartup = user(3L, Role.STARTUP, "outra@unio.com");

        when(userRepository.findById(1L)).thenReturn(Optional.of(startup));
        when(userRepository.findById(2L)).thenReturn(Optional.of(investor));
        when(userRepository.findById(3L)).thenReturn(Optional.of(otherStartup));
        when(startupRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));
        when(messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(any())).thenReturn(Optional.empty());
    }

    @Test
    void startCriaConversaComPapeisNaOrdemCerta() {
        when(conversationRepository.findByStartupUserIdAndInvestorUserId(1L, 2L)).thenReturn(Optional.empty());

        ConversationResponse response = service.startOrGet(new AuthUser(investor), 1L);

        assertThat(response.participant().id()).isEqualTo(1L);
        assertThat(response.participant().role()).isEqualTo("STARTUP");
        assertThat(response.participant().name()).isEqualTo("startup");
        verify(conversationRepository).save(any(Conversation.class));
    }

    @Test
    void startDevolveConversaExistenteSemDuplicar() {
        Conversation existing = conversation(10L);
        when(conversationRepository.findByStartupUserIdAndInvestorUserId(1L, 2L)).thenReturn(Optional.of(existing));

        ConversationResponse response = service.startOrGet(new AuthUser(startup), 2L);

        assertThat(response.id()).isEqualTo(10L);
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void startEntreDuasStartupsEhRecusado() {
        assertThatThrownBy(() -> service.startOrGet(new AuthUser(startup), 3L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void startConsigoMesmoEhRecusado() {
        assertThatThrownBy(() -> service.startOrGet(new AuthUser(startup), 1L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void adminNaoParticipaDaComunicacao() {
        User admin = user(99L, Role.ADMIN, "admin@unio.com");

        assertThatThrownBy(() -> service.startOrGet(new AuthUser(admin), 1L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void sendSalvaMensagemSemEspacosEAtualizaUltimaAtividade() {
        Conversation existing = conversation(10L);
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(existing));

        MessageResponse response = service.send(new AuthUser(startup), 10L, "  Olá, investidor!  ");

        assertThat(response.content()).isEqualTo("Olá, investidor!");
        assertThat(response.mine()).isTrue();
        assertThat(existing.getLastMessageAt()).isNotNull();
    }

    @Test
    void sendEmConversaDeTerceirosDevolve404() {
        Conversation existing = conversation(10L);
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.send(new AuthUser(otherStartup), 10L, "invasão"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendSoComEspacosEhRecusado() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation(10L)));

        assertThatThrownBy(() -> service.send(new AuthUser(startup), 10L, "   "))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void markAsReadSoMarcaMensagensRecebidas() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation(10L)));
        when(messageRepository.markAsRead(eq(10L), eq(2L), any(Instant.class))).thenReturn(3);

        assertThat(service.markAsRead(new AuthUser(investor), 10L)).isEqualTo(3);
    }

    private Conversation conversation(Long id) {
        return Conversation.builder()
                .id(id)
                .startupUser(startup)
                .investorUser(investor)
                .createdAt(Instant.now())
                .build();
    }

    private static User user(Long id, Role role, String email) {
        return User.builder().id(id).role(role).email(email).passwordHash("x").build();
    }
}

package br.com.unio.matchmaking_backend.communication.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.ConversationResponse;
import br.com.unio.matchmaking_backend.communication.dto.MessagePageResponse;
import br.com.unio.matchmaking_backend.communication.dto.MessageResponse;
import br.com.unio.matchmaking_backend.communication.entity.Conversation;
import br.com.unio.matchmaking_backend.communication.entity.Message;
import br.com.unio.matchmaking_backend.communication.repository.ConversationRepository;
import br.com.unio.matchmaking_backend.communication.repository.MessageRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** T09a (RF05) — mensagens entre startup e investidor dentro da plataforma. */
@Service
@RequiredArgsConstructor
public class ConversationService {

    static final int MAX_PAGE_SIZE = 100;
    static final int PREVIEW_LENGTH = 120;

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ParticipantService participantService;

    /** Abre a conversa com o participante ou devolve a que já existe (idempotente). */
    @Transactional
    public ConversationResponse startOrGet(AuthUser authUser, Long participantId) {
        User me = participantService.requireCommunicatingUser(authUser);
        User other = participantService.requireCounterpart(me, participantId);

        User startup = me.getRole() == Role.STARTUP ? me : other;
        User investor = me.getRole() == Role.INVESTOR ? me : other;

        Conversation conversation = conversationRepository
                .findByStartupUserIdAndInvestorUserId(startup.getId(), investor.getId())
                .orElseGet(() -> conversationRepository.save(Conversation.builder()
                        .startupUser(startup)
                        .investorUser(investor)
                        .createdAt(Instant.now())
                        .build()));

        return toResponse(conversation, me.getId());
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> listMine(AuthUser authUser) {
        User me = participantService.requireCommunicatingUser(authUser);
        return conversationRepository.findAllByParticipant(me.getId()).stream()
                .map(conversation -> toResponse(conversation, me.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public MessagePageResponse listMessages(AuthUser authUser, Long conversationId, int page, int size) {
        Conversation conversation = requireParticipantConversation(authUser, conversationId);

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<Message> result = messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversation.getId(), PageRequest.of(safePage, safeSize));

        List<MessageResponse> content = result.getContent().stream()
                .map(message -> MessageResponse.from(message, authUser.getId()))
                .toList();
        return new MessagePageResponse(content, safePage, safeSize, result.getTotalElements(), result.getTotalPages());
    }

    @Transactional
    public MessageResponse send(AuthUser authUser, Long conversationId, String rawContent) {
        Conversation conversation = requireParticipantConversation(authUser, conversationId);

        User other = conversation.otherParticipant(authUser.getId());
        if (!participantService.isActive(other)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "O outro participante removeu a conta; a conversa está encerrada");
        }

        String content = rawContent == null ? "" : rawContent.strip();
        if (content.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A mensagem não pode ser vazia");
        }

        Instant now = Instant.now();
        Message message = messageRepository.save(Message.builder()
                .conversation(conversation)
                .sender(participantService.requireUser(authUser.getId()))
                .content(content)
                .createdAt(now)
                .build());

        conversation.setLastMessageAt(now);
        conversationRepository.save(conversation);

        return MessageResponse.from(message, authUser.getId());
    }

    /** Marca como lidas as mensagens recebidas na conversa; devolve quantas mudaram. */
    @Transactional
    public int markAsRead(AuthUser authUser, Long conversationId) {
        Conversation conversation = requireParticipantConversation(authUser, conversationId);
        return messageRepository.markAsRead(conversation.getId(), authUser.getId(), Instant.now());
    }

    /**
     * Conversa inexistente e conversa de terceiros respondem igual (404),
     * para não revelar quais ids existem.
     */
    Conversation requireParticipantConversation(AuthUser authUser, Long conversationId) {
        participantService.requireCommunicatingUser(authUser);
        return conversationRepository.findById(conversationId)
                .filter(conversation -> conversation.hasParticipant(authUser.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversa não encontrada"));
    }

    private ConversationResponse toResponse(Conversation conversation, Long currentUserId) {
        String preview = messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(conversation.getId())
                .map(Message::getContent)
                .map(ConversationService::preview)
                .orElse(null);
        long unread = messageRepository.countByConversationIdAndSenderIdNotAndReadAtIsNull(
                conversation.getId(), currentUserId);

        return new ConversationResponse(
                conversation.getId(),
                participantService.toDto(conversation.otherParticipant(currentUserId)),
                conversation.getCreatedAt(),
                conversation.getLastMessageAt(),
                preview,
                unread);
    }

    static String preview(String content) {
        if (content == null || content.length() <= PREVIEW_LENGTH) {
            return content;
        }
        return content.substring(0, PREVIEW_LENGTH - 1) + "…";
    }
}

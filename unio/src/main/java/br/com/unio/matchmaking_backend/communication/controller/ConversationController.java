package br.com.unio.matchmaking_backend.communication.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.ConversationResponse;
import br.com.unio.matchmaking_backend.communication.dto.ConversationStartRequest;
import br.com.unio.matchmaking_backend.communication.dto.MessageCreateRequest;
import br.com.unio.matchmaking_backend.communication.dto.MessagePageResponse;
import br.com.unio.matchmaking_backend.communication.dto.MessageResponse;
import br.com.unio.matchmaking_backend.communication.service.ConversationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STARTUP','INVESTOR')")
@Tag(name = "Mensagens", description = "T09a / RF05 — conversas entre startup e investidor")
public class ConversationController {

    private final ConversationService conversationService;

    @PostMapping
    @Operation(summary = "Abre (ou recupera) a conversa com outro usuário",
            description = "Idempotente: se a conversa com o participante já existir, ela é devolvida.")
    public ResponseEntity<ConversationResponse> start(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody ConversationStartRequest request
    ) {
        return ResponseEntity.ok(conversationService.startOrGet(authUser, request.participantId()));
    }

    @GetMapping
    @Operation(summary = "Lista as conversas do usuário logado, da mais recente para a mais antiga")
    public ResponseEntity<List<ConversationResponse>> listMine(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(conversationService.listMine(authUser));
    }

    @GetMapping("/{conversationId}/messages")
    @Operation(summary = "Lista mensagens paginadas (mais recentes primeiro)")
    public ResponseEntity<MessagePageResponse> listMessages(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        return ResponseEntity.ok(conversationService.listMessages(authUser, conversationId, page, size));
    }

    @PostMapping("/{conversationId}/messages")
    @Operation(summary = "Envia uma mensagem (até 2000 caracteres)")
    public ResponseEntity<MessageResponse> send(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long conversationId,
            @Valid @RequestBody MessageCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(conversationService.send(authUser, conversationId, request.content()));
    }

    @PostMapping("/{conversationId}/read")
    @Operation(summary = "Marca como lidas as mensagens recebidas na conversa")
    public ResponseEntity<Map<String, Integer>> markAsRead(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long conversationId
    ) {
        return ResponseEntity.ok(Map.of("updated", conversationService.markAsRead(authUser, conversationId)));
    }
}

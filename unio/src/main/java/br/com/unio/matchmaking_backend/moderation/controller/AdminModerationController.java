package br.com.unio.matchmaking_backend.moderation.controller;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.moderation.dto.AccountModerationItem;
import br.com.unio.matchmaking_backend.moderation.dto.ModerationPage;
import br.com.unio.matchmaking_backend.moderation.dto.ModerationReasonRequest;
import br.com.unio.matchmaking_backend.moderation.dto.PitchModerationItem;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModerationStatus;
import br.com.unio.matchmaking_backend.moderation.entity.PitchPublicationStatus;
import br.com.unio.matchmaking_backend.moderation.service.AccountModerationService;
import br.com.unio.matchmaking_backend.moderation.service.PitchPublicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
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

/**
 * D063 (RF08, RNF10): moderação de cadastros e de conteúdo. Somente ADMIN (403 para os
 * demais). Toda ação grava uma linha no log de auditoria existente (GET /api/admin/audit).
 */
@RestController
@RequestMapping("/api/admin/moderation")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Moderação", description = "D063: cadastros e pitches (somente ADMIN), com auditoria")
public class AdminModerationController {

    private static final String ACCOUNT_RULES = " O ADMIN não modera a si mesmo (400) nem outro ADMIN (403). "
            + "Conta inexistente: 404. Conta excluída pelo titular: 409. Repetir a situação atual responde 200 "
            + "sem mudar nada. Grava no log de auditoria.";

    private final AccountModerationService accountModerationService;
    private final PitchPublicationService pitchPublicationService;

    // ============================================================
    // Cadastros
    // ============================================================

    @GetMapping("/accounts")
    @Operation(summary = "Lista contas de STARTUP e INVESTOR com a situação de moderação",
            description = "Sem registro de moderação, a conta vale APROVADO. Ordem padrão: PENDENTE, SUSPENSO, "
                    + "RECUSADO, APROVADO e, em cada grupo, cadastro mais recente primeiro. Contas excluídas pelo "
                    + "titular ficam de fora.")
    public ResponseEntity<ModerationPage<AccountModerationItem>> accounts(
            @Parameter(description = "Uma ou mais situações separadas por vírgula (APROVADO, PENDENTE, RECUSADO, SUSPENSO)")
            @RequestParam(required = false) List<AccountModerationStatus> status,
            @Parameter(description = "STARTUP ou INVESTOR") @RequestParam(required = false) Role role,
            @Parameter(description = "Busca no e-mail e no nome da startup") @RequestParam(required = false) String q,
            @Parameter(description = "Padrão 20, máximo 100") @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset) {
        return ResponseEntity.ok(accountModerationService.list(status, role, q, limit, offset));
    }

    @PostMapping("/accounts/{userId}/approve")
    @Operation(summary = "Aprova o cadastro", description = "A conta volta a aparecer na descoberta." + ACCOUNT_RULES)
    public ResponseEntity<AccountModerationItem> approve(@AuthenticationPrincipal AuthUser admin,
                                                         @PathVariable Long userId) {
        return ResponseEntity.ok(accountModerationService.approve(admin, userId));
    }

    @PostMapping("/accounts/{userId}/reject")
    @Operation(summary = "Recusa o cadastro",
            description = "Motivo obrigatório (3 a 255 caracteres). Login passa a responder 403 \"Conta recusada pela "
                    + "moderação\", a conta sai da descoberta, dos perfis públicos e das contrapartes, e as reuniões "
                    + "futuras dela são canceladas com motivo. Matches e reuniões passadas ficam." + ACCOUNT_RULES)
    public ResponseEntity<AccountModerationItem> reject(@AuthenticationPrincipal AuthUser admin,
                                                        @PathVariable Long userId,
                                                        @Valid @RequestBody ModerationReasonRequest request) {
        return ResponseEntity.ok(accountModerationService.reject(admin, userId, request.reason()));
    }

    @PostMapping("/accounts/{userId}/suspend")
    @Operation(summary = "Suspende a conta",
            description = "Motivo obrigatório (3 a 255 caracteres). Login passa a responder 403 \"Conta suspensa\" e a "
                    + "conta sai da descoberta, dos perfis públicos e das contrapartes. Nada é apagado nem "
                    + "cancelado." + ACCOUNT_RULES)
    public ResponseEntity<AccountModerationItem> suspend(@AuthenticationPrincipal AuthUser admin,
                                                         @PathVariable Long userId,
                                                         @Valid @RequestBody ModerationReasonRequest request) {
        return ResponseEntity.ok(accountModerationService.suspend(admin, userId, request.reason()));
    }

    @PostMapping("/accounts/{userId}/reactivate")
    @Operation(summary = "Reativa a conta", description = "Volta para APROVADO." + ACCOUNT_RULES)
    public ResponseEntity<AccountModerationItem> reactivate(@AuthenticationPrincipal AuthUser admin,
                                                            @PathVariable Long userId) {
        return ResponseEntity.ok(accountModerationService.reactivate(admin, userId));
    }

    // ============================================================
    // Conteúdo (pitch e Lean Canvas)
    // ============================================================

    @GetMapping("/content")
    @Operation(summary = "Lista os envios de pitch e Lean Canvas, com o conteúdo completo",
            description = "Primeiro os envios atuais EM_REVISAO (o mais antigo primeiro), depois o histórico do mais "
                    + "novo para o mais antigo. current=false: a startup já mandou um envio mais novo. Com filtro de "
                    + "status, envios EM_REVISAO já substituídos ficam de fora.")
    public ResponseEntity<ModerationPage<PitchModerationItem>> content(
            @Parameter(description = "Uma ou mais situações separadas por vírgula (EM_REVISAO, PUBLICADO, REMOVIDO)")
            @RequestParam(required = false) List<PitchPublicationStatus> status,
            @Parameter(description = "Padrão 20, máximo 100") @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset) {
        return ResponseEntity.ok(pitchPublicationService.list(status, limit, offset));
    }

    @PostMapping("/content/{id}/approve")
    @Operation(summary = "Aprova o envio: o pitch passa a aparecer para os investidores",
            description = "Só o envio atual da startup (409 se já foi substituído). 404 se não existir. Repetir "
                    + "responde 200 sem mudar nada. Grava no log de auditoria.")
    public ResponseEntity<PitchModerationItem> approveContent(@AuthenticationPrincipal AuthUser admin,
                                                              @PathVariable Long id) {
        return ResponseEntity.ok(pitchPublicationService.approve(admin, id));
    }

    @PostMapping("/content/{id}/remove")
    @Operation(summary = "Remove o envio: o pitch deixa de aparecer e a startup vê o motivo",
            description = "Motivo obrigatório (3 a 255 caracteres). Só o envio atual da startup (409 se já foi "
                    + "substituído). 404 se não existir. Repetir responde 200 sem mudar nada. Grava no log de "
                    + "auditoria.")
    public ResponseEntity<PitchModerationItem> removeContent(@AuthenticationPrincipal AuthUser admin,
                                                             @PathVariable Long id,
                                                             @Valid @RequestBody ModerationReasonRequest request) {
        return ResponseEntity.ok(pitchPublicationService.remove(admin, id, request.reason()));
    }
}

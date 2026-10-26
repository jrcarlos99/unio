package br.com.unio.matchmaking_backend.privacy.controller;

import br.com.unio.matchmaking_backend.audit.annotation.Auditable;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.privacy.dto.AccountDeletionRequest;
import br.com.unio.matchmaking_backend.privacy.service.DataPrivacyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/privacy")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Tag(name = "Privacidade (LGPD)", description = "T13 / RNF03 — exportação e exclusão de dados do titular")
public class DataPrivacyController {

    private final DataPrivacyService dataPrivacyService;

    @GetMapping("/export")
    @Auditable(action = "DATA_EXPORT", entityType = "User")
    @Operation(summary = "Exporta todos os dados do usuário logado em JSON",
            description = "Conta, consentimento, perfil, onboarding, conversas e mensagens, reuniões, "
                    + "avaliações e o próprio histórico de auditoria. Resposta como anexo .json.")
    public ResponseEntity<Map<String, Object>> export(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("unio-meus-dados.json").build().toString())
                .body(dataPrivacyService.export(authUser));
    }

    @PostMapping("/delete-account")
    @Operation(summary = "Exclui (anonimiza) a conta do usuário logado — irreversível",
            description = "Exige a senha atual e confirmed=true. Depois da exclusão o token deixa de valer.")
    public ResponseEntity<Void> deleteAccount(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody AccountDeletionRequest request
    ) {
        dataPrivacyService.deleteAccount(authUser, request.password());
        return ResponseEntity.noContent().build();
    }
}

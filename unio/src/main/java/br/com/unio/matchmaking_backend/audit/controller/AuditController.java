package br.com.unio.matchmaking_backend.audit.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import br.com.unio.matchmaking_backend.audit.entity.AuditLog;
import br.com.unio.matchmaking_backend.audit.service.AuditService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Administração", description = "Log de auditoria (somente ADMIN)")
@RequestMapping("/api/admin/audit")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<AuditLog>> findRecent() {
        return ResponseEntity.ok(auditService.findRecent());
    }
}

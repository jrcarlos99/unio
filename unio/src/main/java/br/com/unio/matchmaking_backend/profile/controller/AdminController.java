package br.com.unio.matchmaking_backend.profile.controller;

import br.com.unio.matchmaking_backend.audit.annotation.Auditable;
import br.com.unio.matchmaking_backend.profile.dto.BootstrapAdminRequest;
import br.com.unio.matchmaking_backend.profile.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Administração", description = "Gestão de usuários (somente ADMIN)")
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> listUsers() {
        return ResponseEntity.ok(adminService.listUsers());
    }

    @PostMapping("/bootstrap-admin")
    @Auditable(action = "BOOTSTRAP_ADMIN", entityType = "User")
    @Operation(summary = "Cria outro administrador",
            description = "D054. Somente ADMIN. E-mail e senha vão no corpo, nunca na query string. O primeiro "
                    + "administrador é criado na subida pelo AdminSeedRunner (UNIO_ADMIN_EMAIL e "
                    + "UNIO_ADMIN_PASSWORD). Se o e-mail já existir, devolve a conta existente sem alterar.")
    public ResponseEntity<Map<String, Object>> bootstrapAdmin(@Valid @RequestBody BootstrapAdminRequest request) {
        return ResponseEntity.ok(adminService.bootstrapAdmin(request.email(), request.password()));
    }
}

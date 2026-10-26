package br.com.unio.matchmaking_backend.admin.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import br.com.unio.matchmaking_backend.admin.dto.AdminMetricsResponse;
import br.com.unio.matchmaking_backend.admin.service.AdminMetricsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Administração", description = "Métricas de uso do ecossistema (somente ADMIN)")
@RequestMapping("/api/admin/metrics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminMetricsController {

    private final AdminMetricsService adminMetricsService;

    @GetMapping
    public ResponseEntity<AdminMetricsResponse> getMetrics() {
        return ResponseEntity.ok(adminMetricsService.getMetrics());
    }
}

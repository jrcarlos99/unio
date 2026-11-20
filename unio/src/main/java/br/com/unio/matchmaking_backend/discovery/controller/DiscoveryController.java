package br.com.unio.matchmaking_backend.discovery.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.discovery.dto.DiscoveryItemResponse;
import br.com.unio.matchmaking_backend.discovery.dto.DiscoveryPageResponse;
import br.com.unio.matchmaking_backend.discovery.service.DiscoveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/discovery")
@RequiredArgsConstructor
@Tag(name = "Descoberta", description = "D045 e D046: candidatos do papel complementar com score sob demanda")
public class DiscoveryController {

    private static final String LIST_DESCRIPTION = "Usuários ativos do papel complementar, com perfil criado, "
            + "ordenados por score decrescente. O score é calculado e gravado na primeira leitura e recalculado "
            + "quando um dos perfis muda (D045), com até unio.discovery.max-calculations-per-request cálculos "
            + "por requisição (os demais entram em notCalculated). Critério eliminatório violado: score 0 e "
            + "SEM_MATCH. Sem e-mail, documento ou onboarding (D046). Sem perfil próprio: 409.";

    private final DiscoveryService discoveryService;

    @GetMapping("/startups")
    @PreAuthorize("hasRole('INVESTOR')")
    @Operation(summary = "Startups para o investidor logado", description = LIST_DESCRIPTION)
    public ResponseEntity<DiscoveryPageResponse> startups(
            @AuthenticationPrincipal AuthUser authUser,
            @Parameter(description = "Busca em nome, segmento, estágio, localização, modelo e mercado")
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String segmento,
            @RequestParam(required = false) String estagio,
            @Parameter(description = "Score mínimo (0 a 100)") @RequestParam(required = false) BigDecimal minScore,
            @Parameter(description = "Padrão 20, máximo 100") @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset
    ) {
        return ResponseEntity.ok(discoveryService.listStartups(authUser,
                new DiscoveryService.Filter(q, segmento, estagio, null, minScore, limit, offset)));
    }

    @GetMapping("/investors")
    @PreAuthorize("hasRole('STARTUP')")
    @Operation(summary = "Investidores para a startup logada", description = LIST_DESCRIPTION)
    public ResponseEntity<DiscoveryPageResponse> investors(
            @AuthenticationPrincipal AuthUser authUser,
            @Parameter(description = "Busca em nome, tipo, região, segmentos e estágios de interesse")
            @RequestParam(required = false) String q,
            @Parameter(description = "Um dos segmentos de interesse") @RequestParam(required = false) String segmento,
            @Parameter(description = "Um dos estágios de interesse") @RequestParam(required = false) String estagio,
            @Parameter(description = "perfilRisco; Investidor Anjo e Mentor incluem Ambos")
            @RequestParam(required = false) String tipo,
            @Parameter(description = "Score mínimo (0 a 100)") @RequestParam(required = false) BigDecimal minScore,
            @Parameter(description = "Padrão 20, máximo 100") @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset
    ) {
        return ResponseEntity.ok(discoveryService.listInvestors(authUser,
                new DiscoveryService.Filter(q, segmento, estagio, tipo, minScore, limit, offset)));
    }

    @GetMapping("/startups/{userId}")
    @PreAuthorize("hasRole('INVESTOR')")
    @Operation(summary = "Perfil público de uma startup, com a explicação completa do score",
            description = "D046. Startup inexistente, removida ou sem perfil: 404.")
    public ResponseEntity<DiscoveryItemResponse> startup(@AuthenticationPrincipal AuthUser authUser,
                                                         @PathVariable Long userId) {
        return ResponseEntity.ok(discoveryService.startupDetail(authUser, userId));
    }

    @GetMapping("/investors/{userId}")
    @PreAuthorize("hasRole('STARTUP')")
    @Operation(summary = "Perfil público de um investidor, com a explicação completa do score",
            description = "D046. Investidor inexistente, removido ou sem perfil: 404.")
    public ResponseEntity<DiscoveryItemResponse> investor(@AuthenticationPrincipal AuthUser authUser,
                                                          @PathVariable Long userId) {
        return ResponseEntity.ok(discoveryService.investorDetail(authUser, userId));
    }
}

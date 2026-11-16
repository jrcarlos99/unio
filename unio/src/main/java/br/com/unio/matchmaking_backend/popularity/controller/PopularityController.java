package br.com.unio.matchmaking_backend.popularity.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.popularity.dto.PopularityResponse;
import br.com.unio.matchmaking_backend.popularity.dto.ProfileViewRequest;
import br.com.unio.matchmaking_backend.popularity.service.PopularityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STARTUP','INVESTOR')")
@Tag(name = "Popularidade", description = "RF10: popularidade e visitas ao perfil (só agregados)")
public class PopularityController {

    private final PopularityService popularityService;

    @PostMapping("/profile-views")
    @Operation(summary = "Registra a visita do usuário logado a um perfil",
            description = "D041. No máximo uma visita por visitante, por perfil, por dia. Auto-visita e "
                    + "visitante do mesmo papel do alvo são ignorados (também 204). Perfil inexistente ou "
                    + "removido: 404. O visitante nunca é exposto em nenhuma resposta.")
    public ResponseEntity<Void> registerView(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody ProfileViewRequest request
    ) {
        popularityService.registerView(authUser, request.targetUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/profile/me/popularity")
    @Operation(summary = "Popularidade do usuário logado",
            description = "D042. Resumo das avaliações (mínimo de 3 para exibir), reuniões realizadas, visitas "
                    + "nos últimos 28 dias e nos 28 anteriores, 4 janelas semanais e interesses recebidos "
                    + "(0 até o interesse mútuo existir no back). Sem nomes, comentários ou visitantes.")
    public ResponseEntity<PopularityResponse> myPopularity(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(popularityService.myPopularity(authUser));
    }
}

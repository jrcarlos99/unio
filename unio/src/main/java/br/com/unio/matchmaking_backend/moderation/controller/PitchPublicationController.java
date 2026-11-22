package br.com.unio.matchmaking_backend.moderation.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.moderation.dto.PitchPublicationStatusResponse;
import br.com.unio.matchmaking_backend.moderation.dto.PublishedPitchResponse;
import br.com.unio.matchmaking_backend.moderation.service.PitchPublicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * D063 (RF06): a startup envia o pitch e o Lean Canvas para publicação e o investidor vê o
 * que foi publicado. Rotas novas; as rotas existentes de perfil e de descoberta não mudam.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Pitch publicado", description = "D063: envio do pitch e do Lean Canvas e leitura do que foi publicado")
public class PitchPublicationController {

    private final PitchPublicationService pitchPublicationService;

    @PostMapping("/api/profile/startup/pitch/publication")
    @PreAuthorize("hasRole('STARTUP')")
    @Operation(summary = "Envia o pitch e o Lean Canvas atuais para publicação",
            description = "O conteúdo é lido das respostas do onboarding da própria startup (respostas.pitch e "
                    + "respostas.pitchLeanCanvas); o corpo não é usado. Cria um envio novo com versão crescente, "
                    + "EM_REVISAO (unio.moderation.pitch-requer-aprovacao=true, padrão) ou PUBLICADO. O envio novo "
                    + "substitui o anterior para o público. 400: pitch curto vazio, mais de 20000 caracteres no total "
                    + "ou link de vídeo que não é do YouTube ou do Vimeo. 409: sem perfil de startup.")
    public ResponseEntity<PitchPublicationStatusResponse> submit(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(pitchPublicationService.submit(authUser));
    }

    @GetMapping("/api/profile/startup/pitch/publication")
    @PreAuthorize("hasRole('STARTUP')")
    @Operation(summary = "Situação do meu último envio do pitch",
            description = "Status (EM_REVISAO, PUBLICADO, REMOVIDO), motivo da remoção, datas e o conteúdo enviado. "
                    + "Sem envio: 200 com status null. requiresApproval diz se o envio passa pela revisão.")
    public ResponseEntity<PitchPublicationStatusResponse> ownStatus(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(pitchPublicationService.ownStatus(authUser));
    }

    @GetMapping("/api/discovery/startups/{userId}/pitch")
    @PreAuthorize("hasAnyRole('INVESTOR', 'STARTUP', 'ADMIN')")
    @Operation(summary = "Pitch e Lean Canvas publicados de uma startup",
            description = "Para INVESTOR, para a própria startup e para ADMIN (outra STARTUP: 403). Só o envio atual, "
                    + "e só se estiver PUBLICADO: nunca EM_REVISAO nem REMOVIDO. 404 \"Esta startup ainda não publicou "
                    + "o pitch\" quando não há. Startup inexistente, excluída, recusada, suspensa ou pendente: 404.")
    public ResponseEntity<PublishedPitchResponse> published(@AuthenticationPrincipal AuthUser authUser,
                                                            @PathVariable Long userId) {
        return ResponseEntity.ok(pitchPublicationService.published(authUser, userId));
    }
}

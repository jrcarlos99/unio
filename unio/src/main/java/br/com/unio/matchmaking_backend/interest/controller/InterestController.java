package br.com.unio.matchmaking_backend.interest.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.interest.dto.ConnectionResponse;
import br.com.unio.matchmaking_backend.interest.dto.InterestResponse;
import br.com.unio.matchmaking_backend.interest.dto.InterestWithdrawResponse;
import br.com.unio.matchmaking_backend.interest.dto.ReceivedInterestCountResponse;
import br.com.unio.matchmaking_backend.interest.dto.ReceivedInterestPageResponse;
import br.com.unio.matchmaking_backend.interest.service.InterestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STARTUP','INVESTOR')")
@Tag(name = "Interesse e match", description = "D049 a D052: interesse, match mútuo, salvos e contato após o match")
public class InterestController {

    private final InterestService interestService;

    @PutMapping("/interests/{targetUserId}")
    @Operation(summary = "Tenho interesse",
            description = "D049. Idempotente. Se o outro lado já tinha demonstrado interesse, o par vira match "
                    + "(status MATCH com matchedAt); senão, ENVIADO. Só entre STARTUP e INVESTOR ativos com "
                    + "perfil. Sem perfil próprio: 409. Alvo inexistente, removido ou sem perfil: 404. Mesmo "
                    + "papel ou a si mesmo: 400.")
    public ResponseEntity<InterestResponse> express(@AuthenticationPrincipal AuthUser authUser,
                                                    @PathVariable Long targetUserId) {
        return ResponseEntity.ok(interestService.express(authUser, targetUserId));
    }

    @DeleteMapping("/interests/{targetUserId}")
    @Operation(summary = "Retira o interesse (desfaz o match, se havia)",
            description = "D049 e D051. Idempotente. Ao desfazer um match, cancela as reuniões futuras do par "
                    + "(CONFIRMADA com início no futuro e PENDENTE com algum horário sugerido no futuro) e "
                    + "devolve quantas foram canceladas.")
    public ResponseEntity<InterestWithdrawResponse> withdraw(@AuthenticationPrincipal AuthUser authUser,
                                                             @PathVariable Long targetUserId) {
        return ResponseEntity.ok(interestService.withdraw(authUser, targetUserId));
    }

    @GetMapping("/interests/matches")
    @Operation(summary = "Meus unios: matches mútuos do usuário logado",
            description = "D052. Único endpoint que expõe o e-mail do outro lado (contact.email), e só depois do "
                    + "match: a finalidade é o contato externo após o match. Telefone e WhatsApp não existem.")
    public ResponseEntity<List<ConnectionResponse>> matches(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(interestService.matches(authUser));
    }

    @GetMapping("/interests/received")
    @Operation(summary = "Interesses recebidos ainda não correspondidos",
            description = "D065. Quem demonstrou interesse no usuário logado e ainda não teve o interesse "
                    + "retribuído, do mais recente para o mais antigo. Some quando o usuário retribui (vira "
                    + "match) ou quando o outro lado desfaz. Contas ocultas pela moderação (D063) ou excluídas "
                    + "não aparecem. Sem e-mail, documento ou arquivo de pitch (D052). limit padrão 20, máximo "
                    + "100. Retribuir é o PUT /api/interests/{targetUserId}.")
    public ResponseEntity<ReceivedInterestPageResponse> received(@AuthenticationPrincipal AuthUser authUser,
                                                                 @RequestParam(required = false) Integer limit,
                                                                 @RequestParam(required = false) Integer offset) {
        return ResponseEntity.ok(interestService.received(authUser, limit, offset));
    }

    @GetMapping("/interests/received/count")
    @Operation(summary = "Quantos interesses recebidos ainda não foram correspondidos",
            description = "D065. O mesmo total de GET /api/interests/received, sem a lista (para o sino).")
    public ResponseEntity<ReceivedInterestCountResponse> receivedCount(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(interestService.receivedCount(authUser));
    }

    @PutMapping("/saved/{targetUserId}")
    @Operation(summary = "Salva um perfil", description = "D050. Idempotente. O outro lado não é avisado.")
    public ResponseEntity<Void> save(@AuthenticationPrincipal AuthUser authUser, @PathVariable Long targetUserId) {
        interestService.save(authUser, targetUserId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/saved/{targetUserId}")
    @Operation(summary = "Remove um perfil dos salvos", description = "D050. Idempotente.")
    public ResponseEntity<Void> unsave(@AuthenticationPrincipal AuthUser authUser, @PathVariable Long targetUserId) {
        interestService.unsave(authUser, targetUserId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/saved")
    @Operation(summary = "Perfis salvos do usuário logado",
            description = "D050. Mesmo formato resumido dos matches, sem contato.")
    public ResponseEntity<List<ConnectionResponse>> saved(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(interestService.saved(authUser));
    }
}

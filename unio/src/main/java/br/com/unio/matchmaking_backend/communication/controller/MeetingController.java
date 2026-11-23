package br.com.unio.matchmaking_backend.communication.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.MeetingAcceptRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCancelRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCounterProposalRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCounterpartResponse;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCreateRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingDetailsRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingResponse;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.service.MeetingCounterpartService;
import br.com.unio.matchmaking_backend.communication.service.MeetingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STARTUP','INVESTOR')")
@Tag(name = "Reuniões", description = "T09b / RF05 — agendamento de reuniões entre startup e investidor")
public class MeetingController {

    private final MeetingService meetingService;
    private final MeetingCounterpartService meetingCounterpartService;

    @PostMapping
    @Operation(summary = "Propõe uma reunião ao outro participante",
            description = "Cria a reunião como PENDENTE com 1 a 3 horários sugeridos (suggestedTimes). "
                    + "O corpo antigo, só com startsAt, continua valendo como proposta de 1 horário. "
                    + "title é opcional quando vier subject. Local só em format PRESENCIAL. "
                    + "Responde 409 só se todos os horários conflitarem com reuniões CONFIRMADAS (D034).")
    public ResponseEntity<MeetingResponse> schedule(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody MeetingCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(meetingService.schedule(authUser, request));
    }

    @GetMapping
    @Operation(summary = "Lista as reuniões do usuário logado",
            description = "Filtros opcionais: status e intervalo [from, to) em ISO-8601. No intervalo entram "
                    + "as reuniões com algum horário dentro dele (o confirmado ou, numa PENDENTE, um dos sugeridos).")
    public ResponseEntity<List<MeetingResponse>> listMine(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam(required = false) MeetingStatus status,
            @Parameter(description = "Início do intervalo (inclusivo), ex.: 2026-11-09T03:00:00Z")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @Parameter(description = "Fim do intervalo (exclusivo), ex.: 2026-11-16T03:00:00Z")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        return ResponseEntity.ok(meetingService.listMine(authUser, status, from, to));
    }

    @GetMapping("/counterparts")
    @Operation(summary = "Lista com quem o usuário pode marcar reunião",
            description = "Usuários ativos do papel complementar com perfil criado. Sem e-mail nem documento. "
                    + "Ainda não filtra por match mútuo (D039). matchScore é nulo sem score calculado (D037).")
    public ResponseEntity<List<MeetingCounterpartResponse>> counterparts(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(meetingCounterpartService.list(authUser));
    }

    @GetMapping("/{meetingId}")
    @Operation(summary = "Detalha uma reunião")
    public ResponseEntity<MeetingResponse> get(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId
    ) {
        return ResponseEntity.ok(meetingService.get(authUser, meetingId));
    }

    @PostMapping("/{meetingId}/accept")
    @Operation(summary = "Aceita um dos horários sugeridos (PENDENTE → CONFIRMADA)",
            description = "Só quem não fez a proposta vigente. Corpo { \"startsAt\": ... } obrigatório quando há "
                    + "mais de um horário sugerido (deve ser um deles, senão 400). Conflito do horário escolhido "
                    + "com reunião CONFIRMADA → 409.")
    public ResponseEntity<MeetingResponse> accept(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId,
            @RequestBody(required = false) MeetingAcceptRequest request
    ) {
        return ResponseEntity.ok(meetingService.accept(authUser, meetingId, request == null ? null : request.startsAt()));
    }

    @PostMapping("/{meetingId}/decline")
    @Operation(summary = "Recusa a proposta (PENDENTE → RECUSADA)",
            description = "Só quem não fez a proposta vigente.")
    public ResponseEntity<MeetingResponse> decline(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId
    ) {
        return ResponseEntity.ok(meetingService.decline(authUser, meetingId));
    }

    @PostMapping("/{meetingId}/counter-proposal")
    @Operation(summary = "Propõe outros horários ou remarca (→ PENDENTE)",
            description = "PENDENTE: só quem não fez a proposta vigente (contraproposta). CONFIRMADA: qualquer "
                    + "participante (remarcação). Substitui os horários e passa a vez para o outro lado (D033).")
    public ResponseEntity<MeetingResponse> counterPropose(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId,
            @Valid @RequestBody MeetingCounterProposalRequest request
    ) {
        return ResponseEntity.ok(meetingService.counterPropose(authUser, meetingId, request));
    }

    @PatchMapping("/{meetingId}/details")
    @Operation(summary = "Organizador atualiza link e/ou local",
            description = "Só o organizador, com a reunião PENDENTE ou CONFIRMADA. meetingUrl só https (vazio apaga); "
                    + "location só em reunião PRESENCIAL (D036).")
    public ResponseEntity<MeetingResponse> updateDetails(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId,
            @Valid @RequestBody MeetingDetailsRequest request
    ) {
        return ResponseEntity.ok(meetingService.updateDetails(authUser, meetingId, request));
    }

    @PostMapping("/{meetingId}/cancel")
    @Operation(summary = "Qualquer participante cancela (PENDENTE/CONFIRMADA → CANCELADA)")
    public ResponseEntity<MeetingResponse> cancel(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId,
            @Valid @RequestBody(required = false) MeetingCancelRequest request
    ) {
        String reason = request == null ? null : request.reason();
        return ResponseEntity.ok(meetingService.cancel(authUser, meetingId, reason));
    }

    @PostMapping("/{meetingId}/complete")
    @Operation(summary = "Marca como realizada (CONFIRMADA → REALIZADA) após o horário de início")
    public ResponseEntity<MeetingResponse> complete(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId
    ) {
        return ResponseEntity.ok(meetingService.complete(authUser, meetingId));
    }
}

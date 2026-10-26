package br.com.unio.matchmaking_backend.communication.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCancelRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingCreateRequest;
import br.com.unio.matchmaking_backend.communication.dto.MeetingResponse;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import br.com.unio.matchmaking_backend.communication.service.MeetingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STARTUP','INVESTOR')")
@Tag(name = "Reuniões", description = "T09b / RF05 — agendamento de reuniões entre startup e investidor")
public class MeetingController {

    private final MeetingService meetingService;

    @PostMapping
    @Operation(summary = "Propõe uma reunião ao outro participante",
            description = "Cria a reunião como PENDENTE. Recusa horários no passado e conflitos de agenda (409).")
    public ResponseEntity<MeetingResponse> schedule(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody MeetingCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(meetingService.schedule(authUser, request));
    }

    @GetMapping
    @Operation(summary = "Lista as reuniões do usuário logado (filtro opcional por status)")
    public ResponseEntity<List<MeetingResponse>> listMine(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam(required = false) MeetingStatus status
    ) {
        return ResponseEntity.ok(meetingService.listMine(authUser, status));
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
    @Operation(summary = "Convidado aceita a reunião (PENDENTE → CONFIRMADA)")
    public ResponseEntity<MeetingResponse> accept(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId
    ) {
        return ResponseEntity.ok(meetingService.accept(authUser, meetingId));
    }

    @PostMapping("/{meetingId}/decline")
    @Operation(summary = "Convidado recusa a reunião (PENDENTE → RECUSADA)")
    public ResponseEntity<MeetingResponse> decline(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId
    ) {
        return ResponseEntity.ok(meetingService.decline(authUser, meetingId));
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

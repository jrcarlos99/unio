package br.com.unio.matchmaking_backend.review.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.review.dto.ReceivedReviewsResponse;
import br.com.unio.matchmaking_backend.review.dto.ReviewCreateRequest;
import br.com.unio.matchmaking_backend.review.dto.ReviewResponse;
import br.com.unio.matchmaking_backend.review.service.ReviewService;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STARTUP','INVESTOR')")
@Tag(name = "Avaliações", description = "T12 / RF10 — avaliação pós-interação")
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/meetings/{meetingId}/reviews")
    @Operation(summary = "Avalia o outro participante de uma reunião realizada (nota 1–5)",
            description = "Uma avaliação por participante por reunião. Reunião não realizada → 409.")
    public ResponseEntity<ReviewResponse> create(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId,
            @Valid @RequestBody ReviewCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.create(authUser, meetingId, request));
    }

    @GetMapping("/meetings/{meetingId}/reviews")
    @Operation(summary = "Lista as avaliações de uma reunião (só participantes)")
    public ResponseEntity<List<ReviewResponse>> listForMeeting(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long meetingId
    ) {
        return ResponseEntity.ok(reviewService.listForMeeting(authUser, meetingId));
    }

    @GetMapping("/reviews/received")
    @Operation(summary = "Avaliações recebidas pelo usuário logado, com a média")
    public ResponseEntity<ReceivedReviewsResponse> received(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(reviewService.received(authUser));
    }
}

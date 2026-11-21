package br.com.unio.matchmaking_backend.match.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.match.entity.MatchInterest;
import br.com.unio.matchmaking_backend.match.service.MatchInterestService;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
@Tag(name = "Matches", description = "Interesses, perfis salvos e matches confirmados")
public class MatchInterestController {

    private final MatchInterestService matchInterestService;

    @PostMapping("/interest")
    public ResponseEntity<MatchInterest> like(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestBody InterestRequest request) {
        MatchInterest interest = matchInterestService.like(
                authUser, request.startupId(), request.investorId());
        return ResponseEntity.status(HttpStatus.CREATED).body(interest);
    }

    @GetMapping
    public ResponseEntity<List<MatchInterest>> listMatches(
            @AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(matchInterestService.listMatches(authUser));
    }

    @GetMapping("/saved")
    public ResponseEntity<List<MatchInterest>> listSaved(
            @AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(matchInterestService.listSaved(authUser));
    }

    public record InterestRequest(Long startupId, Long investorId) {
    }
}

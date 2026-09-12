package br.com.unio.matchmaking_backend.profile.controller;

import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.profile.dto.InvestorCreateRequest;
import br.com.unio.matchmaking_backend.profile.dto.StartupCreateRequest;
import br.com.unio.matchmaking_backend.profile.service.ProfileService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/profile/me")
    public ResponseEntity<Map<String, Object>> getCurrentProfile(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(profileService.getCurrentProfile(authUser));
    }

    @PutMapping("/profile/me")
    public ResponseEntity<Map<String, Object>> updateCurrentProfile(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestBody Map<String, Object> payload
    ) {
        return ResponseEntity.ok(profileService.updateCurrentProfile(authUser, payload));
    }

    @PostMapping("/profile/startup")
    @PreAuthorize("hasRole('STARTUP')")
    public ResponseEntity<Map<String, Object>> createStartupProfile(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody StartupCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(profileService.createStartupProfile(authUser, request));
    }

    @PostMapping("/profile/investor")
    @PreAuthorize("hasRole('INVESTOR')")
    public ResponseEntity<Map<String, Object>> createInvestorProfile(
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody InvestorCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(profileService.createInvestorProfile(authUser, request));
    }
}
package br.com.unio.matchmaking_backend.auth.controller;

import br.com.unio.matchmaking_backend.auth.dto.AuthResponse;
import br.com.unio.matchmaking_backend.auth.dto.ForgotPasswordRequest;
import br.com.unio.matchmaking_backend.auth.dto.LoginRequest;
import br.com.unio.matchmaking_backend.auth.dto.MessageResponse;
import br.com.unio.matchmaking_backend.auth.dto.RegisterRequest;
import br.com.unio.matchmaking_backend.auth.dto.ResetPasswordRequest;
import br.com.unio.matchmaking_backend.auth.service.AuthService;
import br.com.unio.matchmaking_backend.auth.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request.getEmail(), request.getPassword()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.getEmail());
        return ResponseEntity.ok(new MessageResponse(
                "Se o email estiver cadastrado, enviaremos um link para redefinir a senha"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(new MessageResponse("Senha redefinida com sucesso"));
    }
}
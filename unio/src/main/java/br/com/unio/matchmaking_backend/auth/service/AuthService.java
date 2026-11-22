package br.com.unio.matchmaking_backend.auth.service;

import br.com.unio.matchmaking_backend.auth.dto.AuthResponse;
import br.com.unio.matchmaking_backend.auth.dto.RegisterRequest;
import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.consent.entity.ConsentRecord;
import br.com.unio.matchmaking_backend.consent.repository.ConsentRecordRepository;
import br.com.unio.matchmaking_backend.moderation.service.AccountModerationGate;
import java.time.Instant;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    public static final String INVALID_CREDENTIALS = "Credenciais inválidas";

    private final UserRepository userRepository;
    private final ConsentRecordRepository consentRecordRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    // D063: moderação de cadastros. Opcional (setter) para não mudar o construtor.
    private AccountModerationGate moderationGate;

    @Autowired(required = false)
    public void setModerationGate(AccountModerationGate moderationGate) {
        this.moderationGate = moderationGate;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getAcceptedTerms() == null || !request.getAcceptedTerms()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Você deve aceitar os termos de uso e política de privacidade");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email já cadastrado");
        }

        if (userRepository.existsByDocumento(request.getDocumento())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF/CNPJ já cadastrado");
        }

        Role role = request.getRole();
        if (role == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Criação de administrador deve ser feita por bootstrap interno");
        }

        User user = User.builder()
                .email(normalizedEmail)
                .documento(request.getDocumento())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        User savedUser = userRepository.save(user);
        consentRecordRepository.save(ConsentRecord.builder()
                .user(savedUser)
                .acceptedTerms(Boolean.TRUE.equals(request.getAcceptedTerms()))
                .acceptedAt(Instant.now())
                .build());
        // D063: com cadastro-requer-aprovacao=true a conta nova fica PENDENTE; com false, nada muda
        if (moderationGate != null) {
            moderationGate.onAccountCreated(savedUser);
        }

        String token = jwtService.generateToken(savedUser);
        return AuthResponse.builder()
                .token(token)
                .email(savedUser.getEmail())
                .role(savedUser.getRole().name())
                .build();
    }

    /**
     * D062: qualquer falha de autenticação no login (senha errada, e-mail inexistente, conta
     * desativada) responde 401 com a mesma mensagem curta, no JSON padrão do
     * GlobalExceptionHandler. A mensagem é a mesma em todos os casos para não revelar se o
     * e-mail existe. "Não autenticado" continua sendo o 401 das rotas protegidas sem token.
     */
    public AuthResponse login(String email, String password) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, password)
            );
        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS));
        // D063: conta recusada ou suspensa responde 403 depois da senha conferida; as demais seguem iguais
        if (moderationGate != null) {
            moderationGate.checkLogin(user);
        }

        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }
}
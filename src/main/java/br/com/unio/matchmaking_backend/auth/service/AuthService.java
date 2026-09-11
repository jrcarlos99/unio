package br.com.unio.matchmaking_backend.auth.service;

import br.com.unio.matchmaking_backend.auth.dto.AuthResponse;
import br.com.unio.matchmaking_backend.auth.dto.RegisterRequest;
import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email já cadastrado");
        }

        Role role = request.getRole();
        User user = User.builder()
            .email(normalizedEmail)
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .role(role)
            .build();

        User savedUser = userRepository.save(user);

        switch (role) {
            case STARTUP -> {
                Startup startup = Startup.builder()
                    .user(savedUser)
                    .segmento(request.getSegmento())
                    .estagio(request.getEstagio())
                    .localizacao(request.getLocalizacao())
                    .modeloNegocio(request.getModeloNegocio())
                    .mercadoAlvo(request.getMercadoAlvo())
                    .capitalProcurado(request.getCapitalProcurado())
                    .pitchCanvas(request.getPitchCanvas())
                    .build();
                startupRepository.save(startup);
            }
            case INVESTOR -> {
                Investor investor = Investor.builder()
                    .user(savedUser)
                    .segmentosInteresse(joinList(request.getSegmentosInteresse()))
                    .estagiosInteresse(joinList(request.getEstagiosInteresse()))
                    .ticketMinimo(request.getTicketMinimo())
                    .ticketMaximo(request.getTicketMaximo())
                    .regiaoInteresse(request.getRegiaoInteresse())
                    .perfilRisco(request.getPerfilRisco())
                    .build();
                investorRepository.save(investor);
            }
            case ADMIN -> {
                // admin created only by system bootstrap; no profile payload is required
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Perfil inválido");
        }

        String token = jwtService.generateToken(savedUser);
        return AuthResponse.builder()
            .token(token)
            .email(savedUser.getEmail())
            .role(savedUser.getRole().name())
            .build();
    }

    public AuthResponse login(String email, String password) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(email.trim().toLowerCase(Locale.ROOT), password)
        );

        User user = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas"));

        String token = jwtService.generateToken(user);
        return AuthResponse.builder()
            .token(token)
            .email(user.getEmail())
            .role(user.getRole().name())
            .build();
    }

    private String joinList(java.util.List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(String::trim)
            .collect(Collectors.joining(","));
    }
}

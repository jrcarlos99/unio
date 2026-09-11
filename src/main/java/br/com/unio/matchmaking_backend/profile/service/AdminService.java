package br.com.unio.matchmaking_backend.profile.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<Map<String, Object>> listUsers() {
        return userRepository.findAll().stream()
            .map(this::toSummary)
            .toList();
    }

    @Transactional
    public Map<String, Object> bootstrapAdmin(String email, String password) {
        String normalizedEmail = email.trim().toLowerCase();

        User existing = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (existing != null) {
            return toSummary(existing);
        }

        User admin = User.builder()
            .email(normalizedEmail)
            .passwordHash(passwordEncoder.encode(password))
            .role(Role.ADMIN)
            .build();

        User saved = userRepository.save(admin);
        return toSummary(saved);
    }

    private Map<String, Object> toSummary(User user) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", user.getId());
        payload.put("email", user.getEmail());
        payload.put("role", user.getRole().name());
        payload.put("createdAt", user.getCreatedAt());
        return payload;
    }
}

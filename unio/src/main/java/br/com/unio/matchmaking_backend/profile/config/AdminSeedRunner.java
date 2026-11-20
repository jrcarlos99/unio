package br.com.unio.matchmaking_backend.profile.config;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * D054: cria o primeiro administrador na subida da aplicação.
 *
 * <p>O cadastro público recusa ADMIN e o bootstrap-admin exige um ADMIN logado, então
 * não havia como criar o primeiro. Lê {@code unio.admin.email} e
 * {@code unio.admin.password} (variáveis de ambiente UNIO_ADMIN_EMAIL e
 * UNIO_ADMIN_PASSWORD; nunca no código nem em arquivo versionado) e cria a conta
 * só se ainda não existir nenhum ADMIN. Sem as duas propriedades, não faz nada.
 * A senha nunca vai para o log.
 */
@Slf4j
@Component
public class AdminSeedRunner implements CommandLineRunner {

    static final int MIN_PASSWORD_LENGTH = 8;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public AdminSeedRunner(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           @Value("${unio.admin.email:}") String email,
                           @Value("${unio.admin.password:}") String password) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seed();
    }

    /** Devolve true quando criou o administrador. */
    @Transactional
    public boolean seed() {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.debug("[admin-seed] unio.admin.email/unio.admin.password não configurados. Nada a fazer.");
            return false;
        }
        if (userRepository.existsByRole(Role.ADMIN)) {
            log.info("[admin-seed] Já existe administrador. Seed ignorado.");
            return false;
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            log.warn("[admin-seed] unio.admin.password tem menos de {} caracteres. Administrador não criado.",
                    MIN_PASSWORD_LENGTH);
            return false;
        }
        String normalizedEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            log.warn("[admin-seed] O e-mail configurado já pertence a outra conta. Administrador não criado.");
            return false;
        }
        User saved = userRepository.save(User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(password))
                .role(Role.ADMIN)
                .build());
        log.info("[admin-seed] Administrador criado (id {}).", saved.getId());
        return true;
    }
}

package br.com.unio.matchmaking_backend.communication.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.ParticipantDto;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Regras compartilhadas por mensagens (T09a), reuniões (T09b) e avaliações (T12):
 * comunicação sempre acontece entre uma STARTUP e um INVESTOR, nunca entre dois
 * usuários do mesmo tipo, com ADMIN ou consigo mesmo.
 */
@Service
@RequiredArgsConstructor
public class ParticipantService {

    static final String REMOVED_USER_NAME = "Usuário removido";

    private final UserRepository userRepository;
    private final StartupRepository startupRepository;

    public User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
    }

    /** Garante que quem chama é STARTUP ou INVESTOR. */
    public User requireCommunicatingUser(AuthUser authUser) {
        if (authUser.getRole() != Role.STARTUP && authUser.getRole() != Role.INVESTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Comunicação disponível apenas para STARTUP e INVESTOR");
        }
        return requireUser(authUser.getId());
    }

    /**
     * Valida o outro lado de uma interação: precisa existir, estar ativo e ter o
     * papel complementar ao de quem chama.
     */
    public User requireCounterpart(User me, Long participantId) {
        if (Objects.equals(me.getId(), participantId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Não é possível interagir consigo mesmo");
        }

        User other = userRepository.findById(participantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Participante não encontrado"));

        if (!isActive(other)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Participante não encontrado");
        }

        boolean complementary = (me.getRole() == Role.STARTUP && other.getRole() == Role.INVESTOR)
                || (me.getRole() == Role.INVESTOR && other.getRole() == Role.STARTUP);
        if (!complementary) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A comunicação deve ser entre uma startup e um investidor");
        }
        return other;
    }

    /** Usuários anonimizados pela exclusão de conta (T13) deixam de estar ativos. */
    public boolean isActive(User user) {
        return user != null;
    }

    public ParticipantDto toDto(User user) {
        return new ParticipantDto(user.getId(), displayName(user), user.getRole().name(), isActive(user));
    }

    /**
     * Nome de exibição: nome da startup quando houver perfil; para investidor,
     * a parte do e-mail antes do "@" (o perfil de investidor não tem campo nome).
     */
    public String displayName(User user) {
        if (!isActive(user)) {
            return REMOVED_USER_NAME;
        }
        if (user.getRole() == Role.STARTUP) {
            String startupName = startupRepository.findById(user.getId())
                    .map(Startup::getNome)
                    .orElse(null);
            if (startupName != null && !startupName.isBlank()) {
                return startupName;
            }
        }
        String email = user.getEmail();
        int at = email == null ? -1 : email.indexOf('@');
        return at > 0 ? email.substring(0, at) : "Usuário " + user.getId();
    }
}

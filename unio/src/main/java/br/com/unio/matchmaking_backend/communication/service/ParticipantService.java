package br.com.unio.matchmaking_backend.communication.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.dto.ParticipantDto;
import br.com.unio.matchmaking_backend.moderation.service.AccountVisibility;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Regras compartilhadas por mensagens (T09a), reuniões (T09b) e avaliações (T12):
 * comunicação sempre acontece entre uma STARTUP e um INVESTOR, nunca entre dois
 * usuários do mesmo tipo, com ADMIN ou consigo mesmo.
 */
@Service
public class ParticipantService {

    static final String REMOVED_USER_NAME = "Usuário removido";
    public static final String MATCH_REQUIRED_MESSAGE =
            "Vocês precisam dar match (interesse mútuo) para marcar uma reunião";

    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final MeetingMatchPolicy matchPolicy;

    // D063: moderação de cadastros. Opcional (setter) para os construtores não mudarem.
    private AccountVisibility accountVisibility;

    @Autowired(required = false)
    public void setAccountVisibility(AccountVisibility accountVisibility) {
        this.accountVisibility = accountVisibility;
    }

    /** Sem a regra de match (D051 desligada); usado pelos testes de unidade. */
    public ParticipantService(UserRepository userRepository, StartupRepository startupRepository) {
        this(userRepository, startupRepository, MeetingMatchPolicy.disabled());
    }

    @Autowired
    public ParticipantService(UserRepository userRepository, StartupRepository startupRepository,
                              MeetingMatchPolicy matchPolicy) {
        this.userRepository = userRepository;
        this.startupRepository = startupRepository;
        this.matchPolicy = matchPolicy;
    }

    /** Usuário pelo id, ou null (sem lançar 404). */
    public User findUser(Long userId) {
        return userRepository.findById(userId).orElse(null);
    }

    /** STARTUP com INVESTOR, em qualquer ordem. */
    public static boolean complementary(User a, User b) {
        return (a.getRole() == Role.STARTUP && b.getRole() == Role.INVESTOR)
                || (a.getRole() == Role.INVESTOR && b.getRole() == Role.STARTUP);
    }

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

        if (!complementary(me, other)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A comunicação deve ser entre uma startup e um investidor");
        }
        return other;
    }

    /**
     * D051: para PROPOR reunião, os dois precisam ter dado match mútuo quando
     * {@code unio.communication.require-match} está ligada (padrão). 403 com
     * mensagem clara quando não há match.
     */
    public void requireMatchToMeet(User me, User other) {
        if (matchPolicy.required() && !matchPolicy.matched(me.getId(), other.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, MATCH_REQUIRED_MESSAGE);
        }
    }

    /**
     * D051: com a regra ligada, os ids com quem o usuário tem match (as únicas
     * contrapartes de reunião); com a regra desligada, vazio (sem filtro).
     */
    public Optional<Set<Long>> meetingCounterpartFilter(User me) {
        return matchPolicy.required() ? Optional.of(matchPolicy.matchedUserIds(me.getId())) : Optional.empty();
    }

    /**
     * Usuários anonimizados pela exclusão de conta (T13) deixam de estar ativos. D063: conta
     * PENDENTE, RECUSADO ou SUSPENSO na moderação também (sai da descoberta, dos perfis
     * públicos e das contrapartes); conta sem registro de moderação segue igual.
     */
    public boolean isActive(User user) {
        return user != null && !user.isDeleted()
                && (accountVisibility == null || !accountVisibility.isHidden(user.getId()));
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

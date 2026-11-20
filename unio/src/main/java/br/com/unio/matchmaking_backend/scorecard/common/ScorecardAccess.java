package br.com.unio.matchmaking_backend.scorecard.common;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * D048: o scorecard usa UUID "Long-encoded" (new UUID(0, userId), D018 e D025) e os
 * endpoints recebiam ids arbitrários. Agora o lado do par que corresponde ao papel
 * de quem chama precisa ser o próprio usuário logado: o investidor só lê e grava
 * os pares em que é o investidorId, a startup só os pares em que é o startupId.
 * ADMIN continua com acesso a qualquer par.
 */
public final class ScorecardAccess {

    static final String FORBIDDEN_MESSAGE = "O par informado não pertence ao usuário logado";

    private ScorecardAccess() {
    }

    public static UUID scorecardId(Long userId) {
        return userId == null ? null : new UUID(0L, userId);
    }

    /** Converte o UUID "Long-encoded" de volta para o id do usuário, ou null se não for um. */
    public static Long userIdOf(UUID scorecardId) {
        if (scorecardId == null || scorecardId.getMostSignificantBits() != 0L) {
            return null;
        }
        return scorecardId.getLeastSignificantBits();
    }

    public static void requireOwnPair(AuthUser authUser, UUID startupId, UUID investorId) {
        if (authUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Não autenticado");
        }
        Role role = authUser.getRole();
        if (role == Role.ADMIN) {
            return;
        }
        UUID me = scorecardId(authUser.getId());
        boolean own = switch (role) {
            case INVESTOR -> Objects.equals(investorId, me);
            case STARTUP -> Objects.equals(startupId, me);
            default -> false;
        };
        if (!own) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, FORBIDDEN_MESSAGE);
        }
    }

    /** Recomendações de startups: o investidorId da query precisa ser o do investidor logado. */
    public static void requireOwnInvestor(AuthUser authUser, UUID investorId) {
        if (authUser != null && authUser.getRole() == Role.ADMIN) {
            return;
        }
        if (authUser == null || !Objects.equals(investorId, scorecardId(authUser.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, FORBIDDEN_MESSAGE);
        }
    }
}

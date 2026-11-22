package br.com.unio.matchmaking_backend.moderation.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModeration;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModerationStatus;
import br.com.unio.matchmaking_backend.moderation.repository.AccountModerationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * D063: os dois pontos em que o cadastro e o login consultam a moderação. São chamados pelos
 * ganchos do {@code AuthService} (register e login). Para conta sem registro de moderação
 * (todas as contas antigas) nada muda. O ADMIN nunca é moderado nem bloqueado.
 */
@Component
@RequiredArgsConstructor
public class AccountModerationGate {

    public static final String ACCOUNT_REJECTED = "Conta recusada pela moderação";
    public static final String ACCOUNT_SUSPENDED = "Conta suspensa";

    private final AccountModerationRepository repository;
    private final ModerationSettings settings;
    private final AccountVisibility visibility;

    /** Sem registro = APROVADO. */
    @Transactional(readOnly = true)
    public AccountModerationStatus statusOf(Long userId) {
        return repository.findById(userId)
                .map(AccountModeration::getStatus)
                .orElse(AccountModerationStatus.APROVADO);
    }

    /** Conta nova: PENDENTE só quando a aprovação do cadastro está ligada; senão, nada é gravado. */
    @Transactional
    public void onAccountCreated(User user) {
        if (!settings.cadastroRequerAprovacao() || user.getRole() == Role.ADMIN) {
            return;
        }
        repository.save(AccountModeration.builder()
                .userId(user.getId())
                .status(AccountModerationStatus.PENDENTE)
                .build());
        visibility.invalidate();
    }

    /**
     * Chamado depois que a senha confere: conta RECUSADO ou SUSPENSO responde 403 com a
     * mensagem para a tela de login. Senha errada continua 401 antes de chegar aqui, então a
     * situação da conta não aparece para quem não sabe a senha.
     */
    public void checkLogin(User user) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        AccountModerationStatus status = statusOf(user.getId());
        if (status == AccountModerationStatus.RECUSADO) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ACCOUNT_REJECTED);
        }
        if (status == AccountModerationStatus.SUSPENSO) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ACCOUNT_SUSPENDED);
        }
    }
}

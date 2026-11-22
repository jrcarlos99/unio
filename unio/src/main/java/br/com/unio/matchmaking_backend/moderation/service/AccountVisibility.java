package br.com.unio.matchmaking_backend.moderation.service;

import br.com.unio.matchmaking_backend.moderation.entity.AccountModerationStatus;
import br.com.unio.matchmaking_backend.moderation.repository.AccountModerationRepository;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * D063: quais contas estão fora da descoberta, dos perfis públicos e das contrapartes
 * (PENDENTE, RECUSADO e SUSPENSO). É o que o gancho em {@code ParticipantService.isActive}
 * consulta.
 *
 * <p>A descoberta chama {@code isActive} para cada candidato; para não fazer uma consulta por
 * candidato, a lista de ids ocultos (normalmente vazia ou muito curta) fica em memória por
 * {@link #TTL}. Toda ação de moderação limpa a lista na hora e de novo quando a transação
 * termina; em outra instância do App Service a mudança aparece em até {@link #TTL}.
 * O login não usa esta lista: lê o banco direto ({@link AccountModerationGate}).
 */
@Component
public class AccountVisibility {

    static final Duration TTL = Duration.ofSeconds(5);

    private static final List<AccountModerationStatus> HIDDEN = Arrays.stream(AccountModerationStatus.values())
            .filter(AccountModerationStatus::hidesAccount)
            .toList();

    private final AccountModerationRepository repository;

    private volatile Snapshot snapshot;

    public AccountVisibility(AccountModerationRepository repository) {
        this.repository = repository;
    }

    public boolean isHidden(Long userId) {
        return userId != null && hiddenUserIds().contains(userId);
    }

    public Set<Long> hiddenUserIds() {
        Snapshot current = snapshot;
        long now = System.nanoTime();
        if (current == null || now - current.loadedAt() > TTL.toNanos()) {
            current = new Snapshot(Set.copyOf(repository.findUserIdsByStatusIn(HIDDEN)), now);
            snapshot = current;
        }
        return current.ids();
    }

    /** Depois de mudar a moderação de uma conta: limpa agora e quando a transação terminar. */
    public void invalidate() {
        snapshot = null;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    snapshot = null;
                }
            });
        }
    }

    private record Snapshot(Set<Long> ids, long loadedAt) {
    }
}

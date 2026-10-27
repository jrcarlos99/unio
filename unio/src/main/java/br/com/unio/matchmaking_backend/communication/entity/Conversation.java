package br.com.unio.matchmaking_backend.communication.entity;

import br.com.unio.matchmaking_backend.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * T09a (RF05) — conversa entre exatamente uma startup e um investidor.
 * O par (startup, investidor) é único: abrir a conversa de novo devolve a mesma.
 */
@Entity
@Table(
    name = "conversations",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_conversations_pair",
        columnNames = {"startup_user_id", "investor_user_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "startup_user_id", nullable = false)
    private User startupUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "investor_user_id", nullable = false)
    private User investorUser;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public boolean hasParticipant(Long userId) {
        return Objects.equals(startupUser.getId(), userId) || Objects.equals(investorUser.getId(), userId);
    }

    /** O outro lado da conversa, do ponto de vista de {@code userId}. */
    public User otherParticipant(Long userId) {
        return Objects.equals(startupUser.getId(), userId) ? investorUser : startupUser;
    }
}

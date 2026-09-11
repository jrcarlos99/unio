package br.com.unio.matchmaking_backend.matching.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "swipe_actions",
    uniqueConstraints = @UniqueConstraint(name = "uk_swipe_action_user_pair", columnNames = {"source_user_id", "target_user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SwipeAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_user_id", nullable = false)
    private Long sourceUserId;

    @Column(name = "target_user_id", nullable = false)
    private Long targetUserId;

    @Column(name = "action_type", nullable = false, length = 20)
    private String actionType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

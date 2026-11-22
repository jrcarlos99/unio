package br.com.unio.matchmaking_backend.interest.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** D050: perfil salvo (bookmark) por um usuário (V26). Não avisa o outro lado. */
@Entity
@Table(name = "user_saved")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSaved {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "target_user_id", nullable = false)
    private Long targetUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

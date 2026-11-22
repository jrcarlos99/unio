package br.com.unio.matchmaking_backend.popularity.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * D041 (RF10): uma visita ao perfil, no máximo uma por visitante, por perfil, por dia.
 * O visitante fica só aqui, para garantir a regra e a exclusão de conta; nenhuma resposta
 * da API o expõe (as telas recebem só totais).
 */
@Entity
@Table(
    name = "profile_views",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_profile_views_target_viewer_day",
        columnNames = {"target_user_id", "viewer_user_id", "viewed_on"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "target_user_id", nullable = false)
    private Long targetUserId;

    @Column(name = "viewer_user_id", nullable = false)
    private Long viewerUserId;

    @Column(name = "viewed_on", nullable = false)
    private LocalDate viewedOn;
}

package br.com.unio.matchmaking_backend.profile.entity;

import br.com.unio.matchmaking_backend.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "investor_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Investor {

    @Id
    @Column(name = "user_id")
    private Long id;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "segmentos_interesse")
    private String segmentosInteresse;

    @Column(name = "estagios_interesse")
    private String estagiosInteresse;

    @Column(name = "ticket_minimo", precision = 19, scale = 2)
    private BigDecimal ticketMinimo;

    @Column(name = "ticket_maximo", precision = 19, scale = 2)
    private BigDecimal ticketMaximo;

    @Column(name = "regiao_interesse")
    private String regiaoInteresse;

    @Column(name = "perfil_risco")
    private String perfilRisco;

    @Enumerated(EnumType.STRING)
    @Column(name = "disponibilidade", length = 20)
    private DisponibilidadeMentoria disponibilidade;

    @Column(name = "disponibilidade_observacao", length = 255)
    private String disponibilidadeObservacao;

    /** D045: última alteração do perfil; a descoberta recalcula scores mais antigos que ela. */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = Instant.now();
    }
}

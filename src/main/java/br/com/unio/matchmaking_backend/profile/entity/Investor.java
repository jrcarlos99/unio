package br.com.unio.matchmaking_backend.profile.entity;

import br.com.unio.matchmaking_backend.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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
}

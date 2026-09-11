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
@Table(name = "startup_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Startup {

    @Id
    @Column(name = "user_id")
    private Long id;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String segmento;

    @Column(nullable = false)
    private String estagio;

    @Column(nullable = false)
    private String localizacao;

    @Column(name = "modelo_negocio", nullable = false)
    private String modeloNegocio;

    @Column(name = "mercado_alvo", nullable = false)
    private String mercadoAlvo;

    @Column(name = "capital_procurado", nullable = false, precision = 19, scale = 2)
    private BigDecimal capitalProcurado;

    @Column(name = "pitch_canvas", columnDefinition = "TEXT")
    private String pitchCanvas;
}

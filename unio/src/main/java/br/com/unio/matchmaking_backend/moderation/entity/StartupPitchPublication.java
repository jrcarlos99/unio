package br.com.unio.matchmaking_backend.moderation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * D063 (RF06, RF08): um envio do pitch curto e do Lean Canvas de uma startup (V30).
 * Cada envio é uma linha nova; o de maior {@code version} é o que vale para o público.
 */
@Entity
@Table(name = "startup_pitch_publication")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StartupPitchPublication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "pitch_text", nullable = false, columnDefinition = "TEXT")
    private String pitchText;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    /** Os nove blocos do Lean Canvas, em JSON (chaves do front, ver pitchService.ts). */
    @Column(name = "canvas_json", nullable = false, columnDefinition = "TEXT")
    private String canvasJson;

    @Column(nullable = false)
    private Integer version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PitchPublicationStatus status;

    @Column(length = 255)
    private String reason;

    @Column(name = "reviewed_by_user_id")
    private Long reviewedByUserId;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;
}

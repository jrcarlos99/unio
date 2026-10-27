package br.com.unio.matchmaking_backend.communication.entity;

import br.com.unio.matchmaking_backend.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** T09b (RF05) — reunião proposta por um participante (organizador) ao outro (convidado). */
@Entity
@Table(name = "meetings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_user_id", nullable = false)
    private User organizer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invitee_user_id", nullable = false)
    private User invitee;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String agenda;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Column(name = "meeting_url", length = 500)
    private String meetingUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MeetingStatus status;

    @Column(name = "cancel_reason", length = 255)
    private String cancelReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean hasParticipant(Long userId) {
        return isOrganizer(userId) || isInvitee(userId);
    }

    public boolean isOrganizer(Long userId) {
        return Objects.equals(organizer.getId(), userId);
    }

    public boolean isInvitee(Long userId) {
        return Objects.equals(invitee.getId(), userId);
    }

    public User otherParticipant(Long userId) {
        return isOrganizer(userId) ? invitee : organizer;
    }
}

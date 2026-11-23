package br.com.unio.matchmaking_backend.communication.entity;

import br.com.unio.matchmaking_backend.auth.entity.User;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/**
 * T09b (RF05): reunião criada por um participante (organizador) com o outro (convidado).
 *
 * <p>Desde a V24 (D032, D033): a reunião guarda a proposta de horários vigente
 * (1 a 3 horários em {@link MeetingSuggestedTime}) e quem a fez ({@code proposer}).
 * Quem responde uma PENDENTE é sempre o outro participante. O organizador continua
 * sendo quem criou a reunião e é o único que edita link e local (D036).
 */
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

    /** Quem fez a proposta de horários vigente (D033). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proposer_user_id", nullable = false)
    private User proposer;

    @Column(nullable = false, length = 150)
    private String title;

    /** Assunto escolhido na tela (ex.: "Apresentação de pitch"), D035. */
    @Column(length = 40)
    private String subject;

    /** Mensagem de quem propôs, até 280 caracteres (D035). */
    @Column(length = 280)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    @Builder.Default
    private MeetingFormat format = MeetingFormat.ONLINE;

    @Column(name = "location_name", length = 150)
    private String locationName;

    @Column(name = "location_address", length = 255)
    private String locationAddress;

    @Column(name = "location_reference", length = 255)
    private String locationReference;

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

    /** Proposta de horários vigente, em ordem cronológica (D032). */
    @OneToMany(mappedBy = "meeting", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @BatchSize(size = 50)
    @Builder.Default
    private List<MeetingSuggestedTime> suggestedTimes = new ArrayList<>();

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

    /** Quem fez a proposta vigente. Reuniões montadas sem proposer (testes antigos) contam o organizador. */
    public boolean isProposer(Long userId) {
        User current = proposer != null ? proposer : organizer;
        return Objects.equals(current.getId(), userId);
    }

    /** Quem deve responder a proposta vigente: o participante que não a fez. */
    public boolean isResponder(Long userId) {
        return hasParticipant(userId) && !isProposer(userId);
    }

    /** Horários da proposta vigente; reunião sem horários gravados devolve o starts_at. */
    public List<Instant> suggestedInstants() {
        if (suggestedTimes == null || suggestedTimes.isEmpty()) {
            return startsAt == null ? List.of() : List.of(startsAt);
        }
        return suggestedTimes.stream().map(MeetingSuggestedTime::getStartsAt).toList();
    }

    /**
     * Troca a proposta vigente reaproveitando as linhas por posição (evita violar
     * a UNIQUE (meeting_id, position) com insert antes do delete). {@code times}
     * já vem validado e em ordem cronológica.
     */
    public void replaceSuggestedTimes(List<Instant> times) {
        if (suggestedTimes == null) {
            suggestedTimes = new ArrayList<>();
        }
        for (int i = 0; i < times.size(); i++) {
            if (i < suggestedTimes.size()) {
                suggestedTimes.get(i).setStartsAt(times.get(i));
            } else {
                suggestedTimes.add(MeetingSuggestedTime.builder()
                        .meeting(this)
                        .startsAt(times.get(i))
                        .position(i + 1)
                        .build());
            }
        }
        while (suggestedTimes.size() > times.size()) {
            suggestedTimes.remove(suggestedTimes.size() - 1);
        }
    }
}

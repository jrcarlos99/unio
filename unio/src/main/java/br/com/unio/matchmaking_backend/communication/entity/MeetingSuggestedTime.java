package br.com.unio.matchmaking_backend.communication.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Um dos horários (1 a 3) da proposta vigente de uma reunião (D032). A posição
 * segue a ordem cronológica: a posição 1 é o horário que fica em starts_at
 * enquanto a reunião está PENDENTE.
 */
@Entity
@Table(name = "meeting_suggested_times")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingSuggestedTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "position", nullable = false)
    private Integer position;
}

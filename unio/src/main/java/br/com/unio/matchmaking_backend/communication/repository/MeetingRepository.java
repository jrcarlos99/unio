package br.com.unio.matchmaking_backend.communication.repository;

import br.com.unio.matchmaking_backend.communication.entity.Meeting;
import br.com.unio.matchmaking_backend.communication.entity.MeetingStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    @Query("""
            select m from Meeting m
            join fetch m.organizer
            join fetch m.invitee
            where m.organizer.id = :userId or m.invitee.id = :userId
            order by m.startsAt desc
            """)
    List<Meeting> findAllByParticipant(@Param("userId") Long userId);

    /**
     * Quantas reuniões de qualquer um dos usuários, nos {@code statuses} informados,
     * se sobrepõem ao intervalo [startsAt, endsAt). {@code excludeId} ignora a própria
     * reunião. Desde a D034 o MeetingService passa só CONFIRMADA: pendentes não
     * ocupam a agenda.
     */
    @Query("""
            select count(m) from Meeting m
            where m.id <> :excludeId
              and m.status in :statuses
              and (m.organizer.id in :userIds or m.invitee.id in :userIds)
              and m.startsAt < :endsAt
              and m.endsAt > :startsAt
            """)
    long countOverlapping(@Param("userIds") Collection<Long> userIds,
                          @Param("startsAt") Instant startsAt,
                          @Param("endsAt") Instant endsAt,
                          @Param("statuses") Collection<MeetingStatus> statuses,
                          @Param("excludeId") Long excludeId);

    long countByStatus(MeetingStatus status);

    /** Reuniões de um participante num status (ex.: REALIZADA na popularidade, D042). */
    @Query("""
            select count(m) from Meeting m
            where m.status = :status
              and (m.organizer.id = :userId or m.invitee.id = :userId)
            """)
    long countByParticipantAndStatus(@Param("userId") Long userId, @Param("status") MeetingStatus status);
}

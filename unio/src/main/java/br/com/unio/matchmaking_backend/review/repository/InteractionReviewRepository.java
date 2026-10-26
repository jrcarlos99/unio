package br.com.unio.matchmaking_backend.review.repository;

import br.com.unio.matchmaking_backend.review.entity.InteractionReview;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InteractionReviewRepository extends JpaRepository<InteractionReview, Long> {

    boolean existsByMeetingIdAndReviewerId(Long meetingId, Long reviewerId);

    List<InteractionReview> findByMeetingIdOrderByCreatedAtAsc(Long meetingId);

    List<InteractionReview> findByReviewedIdOrderByCreatedAtDesc(Long reviewedId);

    List<InteractionReview> findByReviewerIdOrderByCreatedAtDesc(Long reviewerId);

    @Query("select avg(r.rating) from InteractionReview r where r.reviewed.id = :userId")
    Double averageRatingFor(@Param("userId") Long userId);

    @Query("select avg(r.rating) from InteractionReview r")
    Double averageRating();

    /** T13 — remove o texto livre das avaliações escritas por um titular que excluiu a conta. */
    @Modifying
    @Query("update InteractionReview r set r.comment = null where r.reviewer.id = :userId")
    int clearCommentsWrittenBy(@Param("userId") Long userId);
}

package br.com.unio.matchmaking_backend.match.repository;

import br.com.unio.matchmaking_backend.match.entity.MatchInterest;
import br.com.unio.matchmaking_backend.match.entity.MatchInterestStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * D058: única fonte de verdade de interesse e match (tabela match_interests, V23).
 *
 * <p>Uma linha = o interesse de {@code likedByUserId} no par (startupId, investorId). Uma
 * linha é "ativa" quando o status não é REJECTED e quem curtiu é um dos dois lados do par.
 * O match mútuo é o par com as duas linhas ativas; o status MATCHED/LIKED é mantido em dia
 * por {@link #syncPairStatus} para as rotas /api/matches.
 *
 * <p>Nas consultas "de/para" ({@code fromUserId}/{@code toUserId}) o par é procurado nas
 * duas ordens, então quem chama não precisa saber qual lado é a startup.
 */
@Repository
public interface MatchInterestRepository extends JpaRepository<MatchInterest, Long> {

    // ------------------------------------------------------------
    // Consultas do main (MatchInterestService / rotas /api/matches)
    // ------------------------------------------------------------

    Optional<MatchInterest> findByStartupIdAndInvestorIdAndLikedByUserId(
            Long startupId, Long investorId, Long likedByUserId);

    List<MatchInterest> findByStartupIdAndInvestorIdAndLikedByUserIdNot(
            Long startupId, Long investorId, Long likedByUserId);

    List<MatchInterest> findByLikedByUserIdAndStatusOrderByCreatedAtDesc(
            Long likedByUserId, MatchInterestStatus status);

    // ------------------------------------------------------------
    // Escrita (D049 e D058)
    // ------------------------------------------------------------

    /**
     * Grava o interesse de {@code likedByUserId} no par. Idempotente: a UNIQUE do par ignora a
     * repetição; uma linha REJECTED volta a valer, com a data de agora. Devolve 1 se gravou.
     */
    @Modifying(flushAutomatically = true)
    @Query(value = """
            insert into match_interests (startup_id, investor_id, liked_by_user_id, status, created_at)
            values (:startupId, :investorId, :likedByUserId, 'LIKED', now())
            on conflict (startup_id, investor_id, liked_by_user_id)
            do update set status = 'LIKED', created_at = now()
            where match_interests.status = 'REJECTED'
            """, nativeQuery = true)
    int insertIfAbsent(@Param("startupId") Long startupId,
                       @Param("investorId") Long investorId,
                       @Param("likedByUserId") Long likedByUserId);

    /**
     * Acerta o status das linhas ativas do par formado por {@code a} e {@code b} (em qualquer
     * ordem): MATCHED se os dois lados têm linha ativa, LIKED se só um tem.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            update match_interests m
            set status = case when (
                    select count(distinct o.liked_by_user_id) from match_interests o
                    where o.startup_id = m.startup_id and o.investor_id = m.investor_id
                      and o.status <> 'REJECTED'
                      and o.liked_by_user_id in (o.startup_id, o.investor_id)) = 2
                then 'MATCHED' else 'LIKED' end
            where ((m.startup_id = :a and m.investor_id = :b) or (m.startup_id = :b and m.investor_id = :a))
              and m.status <> 'REJECTED'
              and m.liked_by_user_id in (m.startup_id, m.investor_id)
            """, nativeQuery = true)
    int syncPairStatus(@Param("a") Long a, @Param("b") Long b);

    /** Retira o interesse de {@code fromUserId} em {@code toUserId}. Idempotente. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            delete from MatchInterest m
            where m.likedByUserId = :fromUserId
              and ((m.startupId = :fromUserId and m.investorId = :toUserId)
                or (m.investorId = :fromUserId and m.startupId = :toUserId))
            """)
    int deletePair(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);

    /** D055: exclusão de conta apaga os interesses do titular, enviados e recebidos. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            delete from MatchInterest m
            where m.startupId = :userId or m.investorId = :userId or m.likedByUserId = :userId
            """)
    int deleteAllInvolving(@Param("userId") Long userId);

    // ------------------------------------------------------------
    // Leitura (D049, D051, D053, D055)
    // ------------------------------------------------------------

    /** Interesse ativo de {@code fromUserId} em {@code toUserId}. */
    @Query("""
            select m from MatchInterest m
            where m.likedByUserId = :fromUserId
              and ((m.startupId = :fromUserId and m.investorId = :toUserId)
                or (m.investorId = :fromUserId and m.startupId = :toUserId))
              and m.status <> br.com.unio.matchmaking_backend.match.entity.MatchInterestStatus.REJECTED
            """)
    Optional<MatchInterest> findActive(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);

    default boolean existsActive(Long fromUserId, Long toUserId) {
        return findActive(fromUserId, toUserId).isPresent();
    }

    /** Interesses ativos enviados pelo usuário, do mais recente para o mais antigo. */
    @Query("""
            select m from MatchInterest m
            where m.likedByUserId = :userId
              and (m.startupId = :userId or m.investorId = :userId)
              and m.status <> br.com.unio.matchmaking_backend.match.entity.MatchInterestStatus.REJECTED
            order by m.createdAt desc
            """)
    List<MatchInterest> findActiveSentBy(@Param("userId") Long userId);

    /** Interesses ativos que outras pessoas demonstraram no usuário. */
    @Query("""
            select m from MatchInterest m
            where (m.startupId = :userId or m.investorId = :userId)
              and m.likedByUserId <> :userId
              and (m.likedByUserId = m.startupId or m.likedByUserId = m.investorId)
              and m.status <> br.com.unio.matchmaking_backend.match.entity.MatchInterestStatus.REJECTED
            """)
    List<MatchInterest> findActiveReceivedBy(@Param("userId") Long userId);

    /** Total de interesses ativos recebidos (sem dizer de quem). */
    @Query("""
            select count(m) from MatchInterest m
            where (m.startupId = :userId or m.investorId = :userId)
              and m.likedByUserId <> :userId
              and (m.likedByUserId = m.startupId or m.likedByUserId = m.investorId)
              and m.status <> br.com.unio.matchmaking_backend.match.entity.MatchInterestStatus.REJECTED
            """)
    long countActiveReceivedBy(@Param("userId") Long userId);

    /** Ids com quem o usuário tem match mútuo (as duas linhas ativas). */
    @Query(value = """
            select case when s.startup_id = :userId then s.investor_id else s.startup_id end
            from match_interests s
            join match_interests i
              on i.startup_id = s.startup_id and i.investor_id = s.investor_id
             and i.liked_by_user_id = i.investor_id and i.status <> 'REJECTED'
            where s.liked_by_user_id = s.startup_id and s.status <> 'REJECTED'
              and (s.startup_id = :userId or s.investor_id = :userId)
            """, nativeQuery = true)
    List<Long> findMatchedUserIds(@Param("userId") Long userId);

    /** D053: pares com match mútuo na plataforma (cada par conta uma vez). */
    @Query(value = """
            select count(*) from match_interests s
            join match_interests i
              on i.startup_id = s.startup_id and i.investor_id = s.investor_id
             and i.liked_by_user_id = i.investor_id and i.status <> 'REJECTED'
            where s.liked_by_user_id = s.startup_id and s.status <> 'REJECTED'
            """, nativeQuery = true)
    long countMutualMatches();

    /** D053: pares com match mútuo de um usuário. */
    @Query(value = """
            select count(*) from match_interests s
            join match_interests i
              on i.startup_id = s.startup_id and i.investor_id = s.investor_id
             and i.liked_by_user_id = i.investor_id and i.status <> 'REJECTED'
            where s.liked_by_user_id = s.startup_id and s.status <> 'REJECTED'
              and (s.startup_id = :userId or s.investor_id = :userId)
            """, nativeQuery = true)
    long countMutualMatchesOf(@Param("userId") Long userId);

    /** D053: interesses ativos na plataforma (cada "Tenho interesse" conta um). */
    @Query("""
            select count(m) from MatchInterest m
            where (m.likedByUserId = m.startupId or m.likedByUserId = m.investorId)
              and m.status <> br.com.unio.matchmaking_backend.match.entity.MatchInterestStatus.REJECTED
            """)
    long countActive();
}

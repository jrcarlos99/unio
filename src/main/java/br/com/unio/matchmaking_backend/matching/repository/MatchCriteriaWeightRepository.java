package br.com.unio.matchmaking_backend.matching.repository;

import br.com.unio.matchmaking_backend.matching.entity.MatchCriteriaWeight;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchCriteriaWeightRepository extends JpaRepository<MatchCriteriaWeight, Long> {

    List<MatchCriteriaWeight> findByActiveTrueOrderByIdAsc();

    MatchCriteriaWeight findByCriteria(MatchCriteriaWeight.CriteriaType criteria);
}

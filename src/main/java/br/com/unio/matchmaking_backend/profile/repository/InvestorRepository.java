package br.com.unio.matchmaking_backend.profile.repository;

import br.com.unio.matchmaking_backend.profile.entity.Investor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvestorRepository extends JpaRepository<Investor, Long> {
}

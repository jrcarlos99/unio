package br.com.unio.matchmaking_backend.profile.repository;

import br.com.unio.matchmaking_backend.profile.entity.Startup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StartupRepository extends JpaRepository<Startup, Long> {
}

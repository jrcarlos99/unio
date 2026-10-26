package br.com.unio.matchmaking_backend.consent.repository;

import br.com.unio.matchmaking_backend.consent.entity.ConsentRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsentRecordRepository extends JpaRepository<ConsentRecord, Long> {

    Optional<ConsentRecord> findByUserId(Long userId);
}

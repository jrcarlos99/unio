package br.com.unio.matchmaking_backend.audit.repository;

import br.com.unio.matchmaking_backend.audit.entity.AuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findTop50ByOrderByCreatedAtDesc();

    /** T13 — registros de auditoria do próprio titular, para a exportação de dados. */
    List<AuditLog> findByActorEmailOrderByCreatedAtDesc(String actorEmail);
}

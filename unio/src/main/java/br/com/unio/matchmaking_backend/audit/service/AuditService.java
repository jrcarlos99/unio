package br.com.unio.matchmaking_backend.audit.service;

import br.com.unio.matchmaking_backend.audit.entity.AuditLog;
import br.com.unio.matchmaking_backend.audit.repository.AuditLogRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public AuditLog log(
            String actorEmail,
            String action,
            String entityType,
            String entityId,
            String details
    ) {
        AuditLog auditLog = AuditLog.builder()
                .actorEmail(actorEmail)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .build();
        return auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> findRecent() {
        return auditLogRepository.findTop50ByOrderByCreatedAtDesc();
    }
}

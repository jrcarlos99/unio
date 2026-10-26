package br.com.unio.matchmaking_backend.audit.aspect;

import br.com.unio.matchmaking_backend.audit.annotation.Auditable;
import br.com.unio.matchmaking_backend.audit.service.AuditService;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    @Around("@annotation(auditable)")
    public Object audit(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        try {
            Object result = joinPoint.proceed();
            auditService.log(currentActorEmail(), auditable.action(), auditable.entityType(), null, null);
            return result;
        } catch (Throwable exception) {
            String message = exception.getMessage();
            String details = "ERRO: " + (message == null ? exception.getClass().getSimpleName() : message);
            auditService.log(currentActorEmail(), auditable.action(), auditable.entityType(), null, details);
            throw exception;
        }
    }

    private String currentActorEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return "anonymous";
        }

        if (authentication.getPrincipal() instanceof AuthUser authUser) {
            return authUser.getEmail();
        }

        return Optional.ofNullable(authentication.getName()).orElse("anonymous");
    }
}

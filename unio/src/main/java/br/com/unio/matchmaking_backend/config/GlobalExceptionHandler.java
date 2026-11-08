package br.com.unio.matchmaking_backend.config;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

/**
 * Bloco E (hardening, RNF07) — formato único de erro da API:
 *
 * <pre>
 * { "timestamp": "...", "status": 400, "error": "Bad Request",
 *   "message": "texto para o usuário", "path": "/api/...",
 *   "errors": [ { "field": "content", "defaultMessage": "..." } ] }   // só em validação
 * </pre>
 *
 * O campo {@code errors[].defaultMessage} é o que o front (getApiErrorMessage) já lê.
 * Exceções de segurança (401/403) NÃO passam por aqui: continuam com o Spring Security.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatusCode status = ex.getStatusCode();
        String message = ex.getReason() != null ? ex.getReason() : ApiErrorFactory.reasonPhrase(status);
        if (status.is5xxServerError()) {
            log.error("Erro {} em {}: {}", status.value(), request.getRequestURI(), message, ex);
        }
        return build(status, message, request, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleBodyValidation(MethodArgumentNotValidException ex,
                                                                    HttpServletRequest request) {
        List<Map<String, String>> errors = ex.getBindingResult().getAllErrors().stream()
                .map(error -> ApiErrorFactory.fieldError(
                        error instanceof FieldError fieldError ? fieldError.getField() : error.getObjectName(),
                        error.getDefaultMessage()))
                .toList();
        return build(HttpStatus.BAD_REQUEST, firstMessage(errors), request, errors);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Map<String, Object>> handleMethodValidation(HandlerMethodValidationException ex,
                                                                      HttpServletRequest request) {
        List<Map<String, String>> errors = ex.getAllErrors().stream()
                .map(error -> ApiErrorFactory.fieldError(fieldName(error), error.getDefaultMessage()))
                .toList();
        return build(HttpStatus.BAD_REQUEST, firstMessage(errors), request, errors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex,
                                                                HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Corpo da requisição ausente ou com JSON inválido", request, null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                                  HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Valor inválido para o parâmetro '" + ex.getName() + "'", request, null);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(MissingServletRequestParameterException ex,
                                                                  HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Parâmetro obrigatório ausente: " + ex.getParameterName(), request, null);
    }

    private static ResponseEntity<Map<String, Object>> build(HttpStatusCode status, String message,
                                                             HttpServletRequest request,
                                                             List<Map<String, String>> errors) {
        return ResponseEntity.status(status)
                .body(ApiErrorFactory.build(status, message, request, errors));
    }

    private static String fieldName(MessageSourceResolvable error) {
        if (error instanceof FieldError fieldError) {
            return fieldError.getField();
        }
        String[] codes = error.getCodes();
        return codes != null && codes.length > 0 ? codes[codes.length - 1] : null;
    }

    private static String firstMessage(List<Map<String, String>> errors) {
        return errors.stream()
                .map(error -> error.get("defaultMessage"))
                .filter(message -> message != null && !message.isBlank())
                .findFirst()
                .orElse("Dados inválidos");
    }

}

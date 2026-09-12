package br.com.unio.matchmaking_backend.scorecard.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class CriticalCriterionViolatedException extends RuntimeException {

    public CriticalCriterionViolatedException(String message) {
        super(message);
    }
}
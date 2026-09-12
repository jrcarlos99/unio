package br.com.unio.matchmaking_backend.scorecard.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class CriterionNotFoundException extends RuntimeException {

    public CriterionNotFoundException(String message) {
        super(message);
    }
}
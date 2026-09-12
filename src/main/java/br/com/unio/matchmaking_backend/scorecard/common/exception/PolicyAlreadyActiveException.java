package br.com.unio.matchmaking_backend.scorecard.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class PolicyAlreadyActiveException extends RuntimeException {

    public PolicyAlreadyActiveException(String message) {
        super(message);
    }
}

package br.com.unio.matchmaking_backend.communication.service;

import br.com.unio.matchmaking_backend.interest.repository.UserInterestRepository;
import java.util.HashSet;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * D051: reunião só entre quem deu match mútuo (as duas linhas em user_interests),
 * controlada por {@code unio.communication.require-match} (padrão true). Substitui
 * parcialmente a D028: vale para PROPOR reunião e para a lista de contrapartes;
 * reuniões já existentes seguem o fluxo normal.
 */
@Component
public class MeetingMatchPolicy {

    private final UserInterestRepository interestRepository;
    private final boolean required;

    @Autowired
    public MeetingMatchPolicy(UserInterestRepository interestRepository,
                              @Value("${unio.communication.require-match:true}") boolean required) {
        this.interestRepository = interestRepository;
        this.required = required;
    }

    /** Regra desligada (usada pelos testes de unidade que montam os services à mão). */
    public static MeetingMatchPolicy disabled() {
        return new MeetingMatchPolicy(null, false);
    }

    public boolean required() {
        return required;
    }

    public boolean matched(Long a, Long b) {
        return interestRepository.existsByFromUserIdAndToUserId(a, b)
                && interestRepository.existsByFromUserIdAndToUserId(b, a);
    }

    public Set<Long> matchedUserIds(Long userId) {
        return new HashSet<>(interestRepository.findMatchedUserIds(userId));
    }
}

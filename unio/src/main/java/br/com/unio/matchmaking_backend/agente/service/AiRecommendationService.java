package br.com.unio.matchmaking_backend.agente.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.onboarding.entity.UserOnboarding;
import br.com.unio.matchmaking_backend.onboarding.repository.UserOnboardingRepository;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.agente.dto.AiRecommendationResponse;
import br.com.unio.matchmaking_backend.agente.dto.AiRecommendation;
import br.com.unio.matchmaking_backend.interest.dto.InterestStatus;
import br.com.unio.matchmaking_backend.interest.service.InterestService;
import br.com.unio.matchmaking_backend.onboarding.entity.OnboardingStatus;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.HashSet;
import java.util.Set;
import java.util.Arrays;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class AiRecommendationService {

    private static final Set<String> ONBOARDING_FIELDS = Set.of(
            "segmentosInteresse", "estagiosInteresse", "preferenciasStartup", "ticketMedio",
            "apenasMentor", "disponibilidade", "formasInteracao", "regioesInteresse",
            "segmento", "estagio", "necessidades", "capitalProcurado", "localizacao",
            "tracao", "tamanhoEquipe", "modeloNegocio", "mercadoAlvo", "pitch"
    );

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final UserOnboardingRepository onboardingRepository;
    private final UserRepository userRepository;
    private final ParticipantService participantService;
    private final InterestService interestService;
    private final ObjectMapper objectMapper;

    @Value("${agente-ia.url:http://localhost:8000}")
    private String agenteUrl;

    public AiRecommendationResponse recommend(AuthUser user, int requestedLimit) {
        int limit = Math.max(1, Math.min(requestedLimit, 20));

        UserOnboarding onboarding = onboardingRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.CONFLICT, "Conclua o onboarding antes de gerar recomendações"));
        if (onboarding.getStatus() != OnboardingStatus.CONCLUIDO) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Conclua o onboarding antes de gerar recomendações");
        }

        Role role = user.getRole();
        if (role == Role.INVESTOR) {
            Investor investor = investorRepository.findById(user.getId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Perfil de investidor não encontrado"));
            return withConnectionState(user.getId(), askAgent("STARTUP", profile(investor), onboarding(user.getId()),
                    startupCandidates(investor.getId()), limit));
        }
        if (role == Role.STARTUP) {
            Startup startup = startupRepository.findById(user.getId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Perfil de startup não encontrado"));
            return withConnectionState(user.getId(), askAgent("INVESTOR", profile(startup), onboarding(user.getId()),
                    investorCandidates(startup.getId()), limit));
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Recomendações disponíveis apenas para startups e investidores");
    }

    private AiRecommendationResponse askAgent(
            String candidateType,
            Map<String, Object> currentProfile,
            Map<String, Object> currentOnboarding,
            List<Map<String, Object>> candidates,
            int limit
    ) {
        if (candidates.isEmpty()) {
            return new AiRecommendationResponse(candidateType, List.of());
        }

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("candidateType", candidateType);
        request.put("perfilAtual", currentProfile);
        request.put("respostasOnboarding", currentOnboarding);
        request.put("candidatos", candidates);
        request.put("limit", limit);

        AiRecommendationResponse response;
        try {
            String json = toJson(request);
            
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(30)) // AUMENTADO: de 10s para 30s (Cold start do Render)
                    .build();

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(java.net.URI.create(agenteUrl + "/v1/recommendations"))
                    .timeout(Duration.ofSeconds(180)) // AUMENTADO: de 60s para 180s (OpenAI pode demorar)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> httpResponse = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (httpResponse.statusCode() >= 400) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "O agente de IA retornou erro HTTP " + httpResponse.statusCode()
                                + ": " + httpResponse.body());
            }
            
            response = objectMapper.readValue(httpResponse.body(), AiRecommendationResponse.class);
            
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Não foi possível conectar ao agente de IA: " + exception.getMessage(),
                    exception);
        }

        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "O agente de IA não retornou recomendações");
        }
        Map<Long, Map<String, Object>> allowed = new LinkedHashMap<>();
        for (Map<String, Object> candidate : candidates) {
            Long candidateId = numericId(candidate.get("candidateId"));
            if (candidateId != null) allowed.put(candidateId, candidate);
        }
        Set<Long> seen = new HashSet<>();
        List<AiRecommendation> validated = response.recommendations().stream()
                .filter(item -> item.candidateId() != null && allowed.containsKey(item.candidateId()))
                .filter(item -> seen.add(item.candidateId()))
                .limit(limit)
                .map(item -> {
                    Map<String, Object> source = allowed.get(item.candidateId());
                    Map<String, Object> publicProfile = new LinkedHashMap<>(source);
                    publicProfile.keySet().removeAll(Set.of("candidateId", "candidateName", "respostasOnboarding"));
                    return new AiRecommendation(item.candidateId(),
                            String.valueOf(source.get("candidateName")), publicProfile,
                            item.compatibility(), item.classification(), item.dataCoverage(), item.summary(),
                            item.strengths(), item.attentionPoints(), item.factors(), item.nextStep(), null, false);
                })
                .toList();
        return new AiRecommendationResponse(candidateType, validated);
    }

    private Long numericId(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private AiRecommendationResponse withConnectionState(Long userId, AiRecommendationResponse response) {
        Map<Long, InterestStatus> statuses = interestService.statusesOf(userId);
        Set<Long> saved = interestService.savedIdsOf(userId);
        List<br.com.unio.matchmaking_backend.agente.dto.AiRecommendation> recommendations =
                response.recommendations().stream()
                        .map(item -> new br.com.unio.matchmaking_backend.agente.dto.AiRecommendation(
                                item.candidateId(), item.candidateName(), item.candidateProfile(),
                                item.compatibility(), item.classification(), item.dataCoverage(), item.summary(),
                                item.strengths(), item.attentionPoints(), item.factors(), item.nextStep(),
                                statuses.getOrDefault(item.candidateId(), InterestStatus.NONE).name(),
                                saved.contains(item.candidateId())))
                        .toList();
        return new AiRecommendationResponse(response.candidateType(), recommendations);
    }

    private List<Map<String, Object>> startupCandidates(Long currentId) {
        return startupRepository.findAll().stream()
                .filter(startup -> !startup.getId().equals(currentId))
                .map(startup -> {
                    User candidateUser = activeCandidateUser(startup.getId(), Role.STARTUP);
                    if (candidateUser == null) return null;
                    Map<String, Object> candidate = profile(startup);
                    candidate.put("candidateName", participantService.displayName(candidateUser));
                    candidate.put("respostasOnboarding", onboarding(startup.getId()));
                    return candidate;
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private List<Map<String, Object>> investorCandidates(Long currentId) {
        return investorRepository.findAll().stream()
                .filter(investor -> !investor.getId().equals(currentId))
                .map(investor -> {
                    User candidateUser = activeCandidateUser(investor.getId(), Role.INVESTOR);
                    if (candidateUser == null) return null;
                    Map<String, Object> candidate = profile(investor);
                    candidate.put("candidateName", participantService.displayName(candidateUser));
                    candidate.put("respostasOnboarding", onboarding(investor.getId()));
                    return candidate;
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private User activeCandidateUser(Long id, Role expectedRole) {
        return userRepository.findById(id)
                .filter(participantService::isActive)
                .filter(user -> user.getRole() == expectedRole)
                .orElse(null);
    }

    private Map<String, Object> profile(Startup startup) {
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("candidateId", startup.getId());
        profile.put("candidateName", startup.getNome());
        profile.put("segmento", startup.getSegmento());
        profile.put("estagio", startup.getEstagio());
        profile.put("localizacao", startup.getLocalizacao());
        profile.put("modeloNegocio", startup.getModeloNegocio());
        profile.put("mercadoAlvo", startup.getMercadoAlvo());
        profile.put("capitalProcurado", startup.getCapitalProcurado());
        profile.put("pitchCanvas", startup.getPitchCanvas());
        return profile;
    }

    private Map<String, Object> profile(Investor investor) {
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("candidateId", investor.getId());
        profile.put("candidateName", "Investidor " + investor.getId());
        profile.put("segmentosInteresse", csvValues(investor.getSegmentosInteresse()));
        profile.put("estagiosInteresse", csvValues(investor.getEstagiosInteresse()));
        profile.put("ticketMinimo", investor.getTicketMinimo());
        profile.put("ticketMaximo", investor.getTicketMaximo());
        profile.put("regiaoInteresse", investor.getRegiaoInteresse());
        profile.put("perfilRisco", investor.getPerfilRisco());
        profile.put("disponibilidade", investor.getDisponibilidade() == null
                ? null : investor.getDisponibilidade().name());
        return profile;
    }

    private List<String> csvValues(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .toList();
    }

    private Map<String, Object> onboarding(Long userId) {
        return onboardingRepository.findById(userId)
                .map(UserOnboarding::getRespostas)
                .filter(value -> value != null && !value.isBlank())
                .map(this::parseJson)
                .map(this::relevantOnboardingAnswers)
                .orElseGet(Map::of);
    }

    private Map<String, Object> relevantOnboardingAnswers(Map<String, Object> answers) {
        Map<String, Object> relevant = new LinkedHashMap<>();
        answers.forEach((key, value) -> {
            if (ONBOARDING_FIELDS.contains(key)) relevant.put(key, value);
        });
        return relevant;
    }

    private Map<String, Object> parseJson(String value) {
        try {
            return objectMapper.readValue(value, MAP_TYPE);
        } catch (Exception exception) {
            return Map.of();
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Não foi possível preparar os dados para a IA", exception);
        }
    }

}

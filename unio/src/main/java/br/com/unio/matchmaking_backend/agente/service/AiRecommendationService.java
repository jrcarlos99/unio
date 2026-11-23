package br.com.unio.matchmaking_backend.agente.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.onboarding.entity.UserOnboarding;
import br.com.unio.matchmaking_backend.onboarding.repository.UserOnboardingRepository;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import br.com.unio.matchmaking_backend.agente.dto.AiRecommendationResponse;
import br.com.unio.matchmaking_backend.onboarding.entity.OnboardingStatus;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
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

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;
    private final UserOnboardingRepository onboardingRepository;
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
                return askAgent("STARTUP", profile(investor), onboarding(user.getId()),
                    startupCandidates(investor.getId()), limit);
        }
        if (role == Role.STARTUP) {
            Startup startup = startupRepository.findById(user.getId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Perfil de startup não encontrado"));
                return askAgent("INVESTOR", profile(startup), onboarding(user.getId()),
                    investorCandidates(startup.getId()), limit);
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
            URL url = URI.create(agenteUrl + "/v1/recommendations").toURL();
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(120_000);
            connection.setReadTimeout(120_000);
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            connection.getOutputStream().write(json.getBytes(StandardCharsets.UTF_8));

            int statusCode = connection.getResponseCode();
            InputStream stream = statusCode >= 400
                    ? connection.getErrorStream()
                    : connection.getInputStream();
            String responseBody = new BufferedReader(
                    new InputStreamReader(stream, StandardCharsets.UTF_8))
                    .lines()
                    .collect(Collectors.joining("\n"));
            connection.disconnect();

            if (statusCode >= 400) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "O agente de IA retornou erro HTTP " + statusCode
                                + ": " + responseBody);
            }
            response = objectMapper.readValue(responseBody, AiRecommendationResponse.class);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Não foi possível conectar ao agente de IA",
                    exception);
        }

        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "O agente de IA não retornou recomendações");
        }
        return response;
    }

    private List<Map<String, Object>> startupCandidates(Long currentId) {
        return startupRepository.findAll().stream()
                .filter(startup -> !startup.getId().equals(currentId))
                .map(startup -> {
                    Map<String, Object> candidate = profile(startup);
                    candidate.put("respostasOnboarding", onboarding(startup.getId()));
                    return candidate;
                })
                .toList();
    }

    private List<Map<String, Object>> investorCandidates(Long currentId) {
        return investorRepository.findAll().stream()
                .filter(investor -> !investor.getId().equals(currentId))
                .map(investor -> {
                    Map<String, Object> candidate = profile(investor);
                    candidate.put("respostasOnboarding", onboarding(investor.getId()));
                    return candidate;
                })
                .toList();
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
        profile.put("segmentosInteresse", investor.getSegmentosInteresse());
        profile.put("estagiosInteresse", investor.getEstagiosInteresse());
        profile.put("ticketMinimo", investor.getTicketMinimo());
        profile.put("ticketMaximo", investor.getTicketMaximo());
        profile.put("regiaoInteresse", investor.getRegiaoInteresse());
        profile.put("perfilRisco", investor.getPerfilRisco());
        return profile;
    }

    private Map<String, Object> onboarding(Long userId) {
        return onboardingRepository.findById(userId)
                .map(UserOnboarding::getRespostas)
                .filter(value -> value != null && !value.isBlank())
                .map(this::parseJson)
                .orElseGet(Map::of);
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

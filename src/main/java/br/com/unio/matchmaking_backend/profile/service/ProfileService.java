package br.com.unio.matchmaking_backend.profile.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.profile.dto.InvestorCreateRequest;
import br.com.unio.matchmaking_backend.profile.dto.StartupCreateRequest;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;

    // ============================================================
    // Leitura e atualização do perfil atual
    // ============================================================

    public Map<String, Object> getCurrentProfile(AuthUser authUser) {
        User user = userRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        return switch (user.getRole()) {
            case STARTUP -> buildStartupProfile(user);
            case INVESTOR -> buildInvestorProfile(user);
            case ADMIN -> buildUserSummary(user);
        };
    }

    @Transactional
    public Map<String, Object> updateCurrentProfile(AuthUser authUser, Map<String, Object> payload) {
        User user = userRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        return switch (user.getRole()) {
            case STARTUP -> updateStartupProfile(user, payload);
            case INVESTOR -> updateInvestorProfile(user, payload);
            case ADMIN -> buildUserSummary(user);
        };
    }

    // ============================================================
    // Tarefa 11.5 — Criação de perfil
    // ============================================================

    @Transactional
    public Map<String, Object> createStartupProfile(AuthUser authUser, StartupCreateRequest request) {
        User user = userRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        if (user.getRole() != Role.STARTUP) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não é do tipo STARTUP");
        }

        if (startupRepository.existsById(user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Perfil Startup já existe");
        }

        Startup startup = Startup.builder()
                .user(user)
                .segmento(request.getSegmento())
                .estagio(request.getEstagio())
                .localizacao(request.getLocalizacao())
                .modeloNegocio(request.getModeloNegocio())
                .mercadoAlvo(request.getMercadoAlvo())
                .capitalProcurado(request.getCapitalProcurado())
                .pitchCanvas(request.getPitchCanvas())
                .build();

        startupRepository.save(startup);
        return buildStartupProfile(user);
    }

    @Transactional
    public Map<String, Object> createInvestorProfile(AuthUser authUser, InvestorCreateRequest request) {
        User user = userRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        if (user.getRole() != Role.INVESTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não é do tipo INVESTOR");
        }

        if (investorRepository.existsById(user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Perfil Investor já existe");
        }

        if (request.getTicketMinimo().compareTo(request.getTicketMaximo()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ticket mínimo não pode ser maior que ticket máximo");
        }

        Investor investor = Investor.builder()
                .user(user)
                .segmentosInteresse(asCsv(request.getSegmentosInteresse()))
                .estagiosInteresse(asCsv(request.getEstagiosInteresse()))
                .ticketMinimo(request.getTicketMinimo())
                .ticketMaximo(request.getTicketMaximo())
                .regiaoInteresse(request.getRegiaoInteresse())
                .perfilRisco(request.getPerfilRisco())
                .build();

        investorRepository.save(investor);
        return buildInvestorProfile(user);
    }

    // ============================================================
    // Builders internos (retorno)
    // ============================================================

    private Map<String, Object> buildStartupProfile(User user) {
        Startup startup = startupRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil Startup não encontrado"));

        Map<String, Object> response = buildUserSummary(user);
        response.put("segmento", startup.getSegmento());
        response.put("estagio", startup.getEstagio());
        response.put("localizacao", startup.getLocalizacao());
        response.put("modeloNegocio", startup.getModeloNegocio());
        response.put("mercadoAlvo", startup.getMercadoAlvo());
        response.put("capitalProcurado", startup.getCapitalProcurado());
        response.put("pitchCanvas", startup.getPitchCanvas());
        return response;
    }

    private Map<String, Object> buildInvestorProfile(User user) {
        Investor investor = investorRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil Investor não encontrado"));

        Map<String, Object> response = buildUserSummary(user);
        response.put("segmentosInteresse", parseStringList(investor.getSegmentosInteresse()));
        response.put("estagiosInteresse", parseStringList(investor.getEstagiosInteresse()));
        response.put("ticketMinimo", investor.getTicketMinimo());
        response.put("ticketMaximo", investor.getTicketMaximo());
        response.put("regiaoInteresse", investor.getRegiaoInteresse());
        response.put("perfilRisco", investor.getPerfilRisco());
        return response;
    }

    private Map<String, Object> buildUserSummary(User user) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("role", user.getRole().name());
        response.put("createdAt", user.getCreatedAt());
        return response;
    }

    // ============================================================
    // Updaters internos
    // ============================================================

    private Map<String, Object> updateStartupProfile(User user, Map<String, Object> payload) {
        Startup startup = startupRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil Startup não encontrado"));

        if (payload.containsKey("segmento")) startup.setSegmento(String.valueOf(payload.get("segmento")));
        if (payload.containsKey("estagio")) startup.setEstagio(String.valueOf(payload.get("estagio")));
        if (payload.containsKey("localizacao")) startup.setLocalizacao(String.valueOf(payload.get("localizacao")));
        if (payload.containsKey("modeloNegocio")) startup.setModeloNegocio(String.valueOf(payload.get("modeloNegocio")));
        if (payload.containsKey("mercadoAlvo")) startup.setMercadoAlvo(String.valueOf(payload.get("mercadoAlvo")));
        if (payload.containsKey("capitalProcurado")) startup.setCapitalProcurado(parseBigDecimal(payload.get("capitalProcurado")));
        if (payload.containsKey("pitchCanvas")) startup.setPitchCanvas(String.valueOf(payload.get("pitchCanvas")));

        startupRepository.save(startup);
        return buildStartupProfile(user);
    }

    private Map<String, Object> updateInvestorProfile(User user, Map<String, Object> payload) {
        Investor investor = investorRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil Investor não encontrado"));

        if (payload.containsKey("segmentosInteresse")) investor.setSegmentosInteresse(asCsv(payload.get("segmentosInteresse")));
        if (payload.containsKey("estagiosInteresse")) investor.setEstagiosInteresse(asCsv(payload.get("estagiosInteresse")));
        if (payload.containsKey("ticketMinimo")) investor.setTicketMinimo(parseBigDecimal(payload.get("ticketMinimo")));
        if (payload.containsKey("ticketMaximo")) investor.setTicketMaximo(parseBigDecimal(payload.get("ticketMaximo")));
        if (payload.containsKey("regiaoInteresse")) investor.setRegiaoInteresse(String.valueOf(payload.get("regiaoInteresse")));
        if (payload.containsKey("perfilRisco")) investor.setPerfilRisco(String.valueOf(payload.get("perfilRisco")));

        investorRepository.save(investor);
        return buildInvestorProfile(user);
    }

    // ============================================================
    // Utilitários
    // ============================================================

    public List<Map<String, Object>> listUsers() {
        List<Map<String, Object>> users = new ArrayList<>();
        for (User user : userRepository.findAll()) {
            users.add(buildUserSummary(user));
        }
        return users;
    }

    private BigDecimal parseBigDecimal(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        if (rawValue instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (rawValue instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(String.valueOf(rawValue));
    }

    private String asCsv(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof List<?> list) {
            return list.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .map(String::trim)
                    .filter(item -> !item.isBlank())
                    .reduce((a, b) -> a + "," + b)
                    .orElse(null);
        }
        return String.valueOf(value);
    }

    private List<String> parseStringList(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        String[] parts = value.split(",");
        List<String> result = new ArrayList<>();
        for (String item : parts) {
            String normalized = item.trim();
            if (!normalized.isEmpty()) {
                result.add(normalized);
            }
        }
        return result;
    }
}
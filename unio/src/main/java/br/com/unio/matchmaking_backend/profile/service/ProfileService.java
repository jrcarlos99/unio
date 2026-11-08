package br.com.unio.matchmaking_backend.profile.service;

import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.profile.dto.InvestorCreateRequest;
import br.com.unio.matchmaking_backend.profile.dto.StartupCreateRequest;
import br.com.unio.matchmaking_backend.profile.entity.DisponibilidadeMentoria;
import br.com.unio.matchmaking_backend.profile.entity.Investor;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.InvestorRepository;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProfileService {

    static final String PERFIL_RISCO_PADRAO = "Investidor Anjo";

    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final InvestorRepository investorRepository;

    @Value("${app.upload.dir:./uploads/pitch/}")
    private String uploadDirectory;

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

    @Transactional
    public String uploadPitch(AuthUser authUser, MultipartFile file) {
        if (authUser.getRole() != Role.STARTUP) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não é do tipo STARTUP");
        }

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo de pitch é obrigatório");
        }
        if (file.getSize() > 10L * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo deve ter no máximo 10 MB");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo deve estar no formato PDF");
        }

        Startup startup = startupRepository.findById(authUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil Startup não encontrado"));

        Path directory = Paths.get(uploadDirectory);
        String filename = UUID.randomUUID() + ".pdf";
        Path target = directory.resolve(filename);

        try {
            Files.createDirectories(directory);
            file.transferTo(target);

            String previousPitchUrl = startup.getPitchFileUrl();
            if (previousPitchUrl != null && !previousPitchUrl.isBlank()) {
                Path previousFile = directory.resolve(Paths.get(previousPitchUrl).getFileName().toString());
                Files.deleteIfExists(previousFile);
            }

            String pitchUrl = "/uploads/pitch/" + filename;
            startup.setPitchFileUrl(pitchUrl);
            startupRepository.save(startup);
            return pitchUrl;
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Não foi possível salvar o arquivo de pitch",
                    exception);
        }
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
                .nome(request.getNome())
                .segmento(request.getSegmento())
                .estagio(request.getEstagio())
                .localizacao(request.getLocalizacao())
                .modeloNegocio(request.getModeloNegocio())
                .mercadoAlvo(request.getMercadoAlvo())
                .capitalProcurado(request.getCapitalProcurado())
                .pitchCanvas(request.getPitchCanvas())
                .disponibilidade(request.getDisponibilidade())
                .disponibilidadeObservacao(request.getDisponibilidadeObservacao())
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

        // Tickets são opcionais (D029): só dá para comparar quando os dois vêm preenchidos
        BigDecimal ticketMinimo = request.getTicketMinimo();
        BigDecimal ticketMaximo = request.getTicketMaximo();
        if (ticketMinimo != null && ticketMaximo != null && ticketMinimo.compareTo(ticketMaximo) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ticket mínimo não pode ser maior que ticket máximo");
        }

        Investor investor = Investor.builder()
                .user(user)
                .segmentosInteresse(asCsv(request.getSegmentosInteresse()))
                .estagiosInteresse(asCsv(request.getEstagiosInteresse()))
                .ticketMinimo(ticketMinimo)
                .ticketMaximo(ticketMaximo)
                .regiaoInteresse(request.getRegiaoInteresse())
                .perfilRisco(perfilRiscoOuPadrao(request.getPerfilRisco()))
                .disponibilidade(request.getDisponibilidade())
                .disponibilidadeObservacao(request.getDisponibilidadeObservacao())
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
        response.put("nome", startup.getNome());
        response.put("segmento", startup.getSegmento());
        response.put("estagio", startup.getEstagio());
        response.put("localizacao", startup.getLocalizacao());
        response.put("modeloNegocio", startup.getModeloNegocio());
        response.put("mercadoAlvo", startup.getMercadoAlvo());
        response.put("capitalProcurado", startup.getCapitalProcurado());
        response.put("pitchCanvas", startup.getPitchCanvas());
        response.put("pitchFileUrl", startup.getPitchFileUrl());
        response.put("disponibilidade", startup.getDisponibilidade());
        response.put("disponibilidadeObservacao", startup.getDisponibilidadeObservacao());
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
        response.put("disponibilidade", investor.getDisponibilidade());
        response.put("disponibilidadeObservacao", investor.getDisponibilidadeObservacao());
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

        if (payload.containsKey("nome")) {
            Object raw = payload.get("nome");
            String value = raw == null ? null : String.valueOf(raw);

            if (value != null && value.length() > 255) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "nome deve ter no máximo 255 caracteres");
            }

            startup.setNome(value);
        }
        if (payload.containsKey("segmento")) startup.setSegmento(String.valueOf(payload.get("segmento")));
        if (payload.containsKey("estagio")) startup.setEstagio(String.valueOf(payload.get("estagio")));
        if (payload.containsKey("localizacao")) startup.setLocalizacao(String.valueOf(payload.get("localizacao")));
        if (payload.containsKey("modeloNegocio")) startup.setModeloNegocio(String.valueOf(payload.get("modeloNegocio")));
        if (payload.containsKey("mercadoAlvo")) startup.setMercadoAlvo(String.valueOf(payload.get("mercadoAlvo")));
        if (payload.containsKey("capitalProcurado")) startup.setCapitalProcurado(parseBigDecimal(payload.get("capitalProcurado")));
        if (payload.containsKey("pitchCanvas")) startup.setPitchCanvas(String.valueOf(payload.get("pitchCanvas")));
        if (payload.containsKey("disponibilidade")) {
            startup.setDisponibilidade(parseDisponibilidade(payload.get("disponibilidade")));
        }
        if (payload.containsKey("disponibilidadeObservacao")) {
            Object raw = payload.get("disponibilidadeObservacao");
            String value = raw == null ? null : String.valueOf(raw);

            if (value != null && value.length() > 255) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "disponibilidadeObservacao deve ter no máximo 255 caracteres");
            }

            startup.setDisponibilidadeObservacao(value);
        }

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
        if (payload.containsKey("disponibilidade")) {
            investor.setDisponibilidade(parseDisponibilidade(payload.get("disponibilidade")));
        }
        if (payload.containsKey("disponibilidadeObservacao")) {
            Object raw = payload.get("disponibilidadeObservacao");
            String value = raw == null ? null : String.valueOf(raw);

            if (value != null && value.length() > 255) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "disponibilidadeObservacao deve ter no máximo 255 caracteres");
            }

            investor.setDisponibilidadeObservacao(value);
        }

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

    // D030: sem perfilRisco o ScorePersistenceService não acha política (POLICY_NOT_FOUND).
    // Qualquer valor não nulo leva hoje à política ANGEL_INVESTOR (ver D025, item 2);
    // "Investidor Anjo" é o rótulo que o front usa para esse tipo.
    private String perfilRiscoOuPadrao(String perfilRisco) {
        return perfilRisco == null || perfilRisco.isBlank() ? PERFIL_RISCO_PADRAO : perfilRisco.trim();
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

    private DisponibilidadeMentoria parseDisponibilidade(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        try {
            return DisponibilidadeMentoria.valueOf(String.valueOf(rawValue));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Disponibilidade de mentoria inválida",
                    exception);
        }
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
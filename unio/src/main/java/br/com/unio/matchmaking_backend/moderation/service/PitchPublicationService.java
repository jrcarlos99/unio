package br.com.unio.matchmaking_backend.moderation.service;

import br.com.unio.matchmaking_backend.audit.service.AuditService;
import br.com.unio.matchmaking_backend.auth.entity.Role;
import br.com.unio.matchmaking_backend.auth.entity.User;
import br.com.unio.matchmaking_backend.auth.repository.UserRepository;
import br.com.unio.matchmaking_backend.auth.service.AuthUser;
import br.com.unio.matchmaking_backend.communication.service.ParticipantService;
import br.com.unio.matchmaking_backend.moderation.dto.ModerationPage;
import br.com.unio.matchmaking_backend.moderation.dto.PitchModerationItem;
import br.com.unio.matchmaking_backend.moderation.dto.PitchPublicationStatusResponse;
import br.com.unio.matchmaking_backend.moderation.dto.PublishedPitchResponse;
import br.com.unio.matchmaking_backend.moderation.entity.PitchPublicationStatus;
import br.com.unio.matchmaking_backend.moderation.entity.StartupPitchPublication;
import br.com.unio.matchmaking_backend.moderation.repository.StartupPitchPublicationRepository;
import br.com.unio.matchmaking_backend.onboarding.entity.UserOnboarding;
import br.com.unio.matchmaking_backend.onboarding.repository.UserOnboardingRepository;
import br.com.unio.matchmaking_backend.profile.entity.Startup;
import br.com.unio.matchmaking_backend.profile.repository.StartupRepository;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * D063 (RF06, RF08): publicação do pitch curto e do Lean Canvas da startup e a moderação
 * desse conteúdo.
 *
 * <ul>
 *   <li>O conteúdo é lido das respostas do onboarding da própria startup
 *       ({@code respostas.pitch} e {@code respostas.pitchLeanCanvas}, as chaves do
 *       pitchService.ts do front), nunca do corpo: o que vai para revisão é exatamente o que
 *       a startup salvou.</li>
 *   <li>Cada envio é uma linha nova com versão crescente; o de maior versão é o que vale.
 *       Só ele aparece ao público, e só se estiver PUBLICADO.</li>
 *   <li>{@code unio.moderation.pitch-requer-aprovacao} (padrão true): envio entra EM_REVISAO;
 *       com false, entra PUBLICADO.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class PitchPublicationService {

    static final int MAX_TOTAL_CHARS = 20_000;
    static final int MAX_VIDEO_URL = 500;
    static final int DEFAULT_LIMIT = 20;
    static final int MAX_LIMIT = 100;

    static final String SHORT_PITCH_KEY = "pitch";
    static final String CANVAS_KEY = "pitchLeanCanvas";
    static final String CANVAS_BLOCKS_KEY = "leanCanvas";
    static final String VIDEO_KEY = "videoUrl";

    /** Ordem de leitura dos blocos (LEAN_CANVAS_FIELDS do front). */
    public static final List<String> CANVAS_FIELDS = List.of(
            "problem", "solution", "keyMetrics", "uniqueValueProposition", "unfairAdvantage",
            "channels", "customerSegments", "costStructure", "revenueStreams");

    static final String ONLY_STARTUP = "Recurso disponível apenas para STARTUP";
    static final String PROFILE_REQUIRED = "Crie seu perfil de startup antes de publicar o pitch";
    static final String SHORT_PITCH_REQUIRED = "Escreva o pitch curto antes de enviar para publicação";
    static final String TOO_LONG = "O pitch e o Lean Canvas passam do limite de 20000 caracteres. "
            + "Encurte o texto e envie de novo";
    static final String INVALID_VIDEO = "O link do vídeo precisa ser do YouTube ou do Vimeo";
    static final String INVALID_FORMAT = "O pitch salvo está em um formato que o servidor não reconhece";
    static final String CONCURRENT = "Outro envio do pitch acabou de ser registrado. Tente de novo";
    static final String VIEWER_FORBIDDEN = "Recurso disponível apenas para INVESTOR, para a própria startup e para ADMIN";
    static final String STARTUP_NOT_FOUND = "Startup não encontrada";
    static final String NOT_PUBLISHED = "Esta startup ainda não publicou o pitch";
    static final String SUBMISSION_NOT_FOUND = "Envio de pitch não encontrado";
    static final String SUPERSEDED = "Este envio foi substituído por um envio mais novo da mesma startup";

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    private static final Set<String> VIDEO_HOSTS = Set.of("youtube.com", "youtu.be", "vimeo.com", "player.vimeo.com");

    private final StartupPitchPublicationRepository repository;
    private final UserOnboardingRepository onboardingRepository;
    private final StartupRepository startupRepository;
    private final UserRepository userRepository;
    private final ParticipantService participantService;
    private final ModerationSettings settings;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    // ============================================================
    // Startup (dona do pitch)
    // ============================================================

    /** POST /api/profile/startup/pitch/publication. */
    @Transactional
    public PitchPublicationStatusResponse submit(AuthUser authUser) {
        Long userId = requireStartup(authUser);
        if (!startupRepository.existsById(userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, PROFILE_REQUIRED);
        }
        Content content = validate(readFromOnboarding(userId));

        StartupPitchPublication publication = StartupPitchPublication.builder()
                .userId(userId)
                .pitchText(content.shortPitch())
                .videoUrl(content.videoUrl())
                .canvasJson(objectMapper.writeValueAsString(content.leanCanvas()))
                .version(repository.findMaxVersion(userId) + 1)
                .status(settings.pitchRequerAprovacao() ? PitchPublicationStatus.EM_REVISAO : PitchPublicationStatus.PUBLICADO)
                .submittedAt(Instant.now())
                .build();
        try {
            return toOwnerResponse(repository.saveAndFlush(publication));
        } catch (DataIntegrityViolationException exception) {
            // Dois envios ao mesmo tempo disputaram a mesma versão (uk_pitch_publication_user_version)
            throw new ResponseStatusException(HttpStatus.CONFLICT, CONCURRENT);
        }
    }

    /** GET /api/profile/startup/pitch/publication. */
    @Transactional(readOnly = true)
    public PitchPublicationStatusResponse ownStatus(AuthUser authUser) {
        Long userId = requireStartup(authUser);
        return repository.findFirstByUserIdOrderByVersionDesc(userId)
                .map(this::toOwnerResponse)
                .orElseGet(() -> new PitchPublicationStatusResponse(null, null, null, null, null, null,
                        settings.pitchRequerAprovacao(), null, null, null));
    }

    // ============================================================
    // Investidor, a própria startup e ADMIN
    // ============================================================

    /** GET /api/discovery/startups/{userId}/pitch: só o envio atual, e só se PUBLICADO. */
    @Transactional(readOnly = true)
    public PublishedPitchResponse published(AuthUser viewer, Long startupUserId) {
        boolean allowed = viewer != null && (viewer.getRole() == Role.INVESTOR
                || viewer.getRole() == Role.ADMIN
                || (viewer.getRole() == Role.STARTUP && Objects.equals(viewer.getId(), startupUserId)));
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, VIEWER_FORBIDDEN);
        }
        User startup = participantService.findUser(startupUserId);
        // isActive já considera conta excluída e a moderação da conta (D063)
        if (startup == null || startup.getRole() != Role.STARTUP || !participantService.isActive(startup)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, STARTUP_NOT_FOUND);
        }
        StartupPitchPublication publication = repository.findFirstByUserIdOrderByVersionDesc(startupUserId)
                .filter(latest -> latest.getStatus() == PitchPublicationStatus.PUBLICADO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_PUBLISHED));
        return new PublishedPitchResponse(
                publication.getUserId(),
                publication.getVersion(),
                publication.getPitchText(),
                publication.getVideoUrl(),
                canvasOf(publication),
                publication.getReviewedAt() != null ? publication.getReviewedAt() : publication.getSubmittedAt());
    }

    // ============================================================
    // ADMIN
    // ============================================================

    /**
     * GET /api/admin/moderation/content. Primeiro os envios atuais EM_REVISAO (o mais antigo
     * primeiro), depois o resto do mais novo para o mais antigo. Envio EM_REVISAO que já foi
     * substituído por um mais novo não entra quando há filtro de status: não aceita ação.
     */
    @Transactional(readOnly = true)
    public ModerationPage<PitchModerationItem> list(Collection<PitchPublicationStatus> statuses,
                                                    Integer limit, Integer offset) {
        List<StartupPitchPublication> all = repository.findAllByOrderBySubmittedAtDesc();
        Map<Long, Integer> latest = latestVersions();
        boolean filtering = statuses != null && !statuses.isEmpty();

        List<StartupPitchPublication> filtered = all.stream()
                .filter(item -> !filtering || (statuses.contains(item.getStatus())
                        && !(item.getStatus() == PitchPublicationStatus.EM_REVISAO && !isCurrent(item, latest))))
                .sorted(Comparator.comparingInt((StartupPitchPublication item) -> inQueue(item, latest) ? 0 : 1)
                        .thenComparing((a, b) -> inQueue(a, latest) && inQueue(b, latest)
                                ? a.getSubmittedAt().compareTo(b.getSubmittedAt())
                                : b.getSubmittedAt().compareTo(a.getSubmittedAt()))
                        .thenComparing(StartupPitchPublication::getId, Comparator.reverseOrder()))
                .toList();

        int safeLimit = limit == null || limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        int safeOffset = Math.max(0, offset == null ? 0 : offset);
        List<StartupPitchPublication> page = filtered.stream().skip(safeOffset).limit(safeLimit).toList();

        Set<Long> userIds = page.stream()
                .flatMap(item -> Stream.of(item.getUserId(), item.getReviewedByUserId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> emails = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> Objects.toString(user.getEmail(), "")));
        Map<Long, String> names = startupRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(Startup::getId, startup -> Objects.toString(startup.getNome(), "")));

        List<PitchModerationItem> items = page.stream()
                .map(item -> toAdminItem(item, isCurrent(item, latest), emails, names))
                .toList();
        return new ModerationPage<>(filtered.size(), safeLimit, safeOffset, items);
    }

    @Transactional
    public PitchModerationItem approve(AuthUser admin, Long publicationId) {
        return decide(admin, publicationId, PitchPublicationStatus.PUBLICADO, null, ModerationActions.PITCH_APPROVED);
    }

    @Transactional
    public PitchModerationItem remove(AuthUser admin, Long publicationId, String reason) {
        return decide(admin, publicationId, PitchPublicationStatus.REMOVIDO,
                ModerationActions.requireReason(reason), ModerationActions.PITCH_REMOVED);
    }

    private PitchModerationItem decide(AuthUser admin, Long publicationId, PitchPublicationStatus target,
                                       String reason, String action) {
        StartupPitchPublication publication = repository.findById(publicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, SUBMISSION_NOT_FOUND));
        int latest = repository.findMaxVersion(publication.getUserId());
        if (!Objects.equals(publication.getVersion(), latest)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, SUPERSEDED);
        }

        PitchPublicationStatus previous = publication.getStatus();
        if (previous != target) {
            publication.setStatus(target);
            publication.setReason(reason);
            publication.setReviewedByUserId(admin.getId());
            publication.setReviewedAt(Instant.now());
            publication = repository.save(publication);
        }

        auditService.log(admin.getEmail(), action, ModerationActions.ENTITY_PITCH, String.valueOf(publicationId),
                auditDetails(publication, previous, target, reason));

        Set<Long> userIds = new HashSet<>();
        userIds.add(publication.getUserId());
        if (publication.getReviewedByUserId() != null) {
            userIds.add(publication.getReviewedByUserId());
        }
        Map<Long, String> emails = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> Objects.toString(user.getEmail(), "")));
        Map<Long, String> names = startupRepository.findById(publication.getUserId())
                .map(startup -> Map.of(startup.getId(), Objects.toString(startup.getNome(), "")))
                .orElse(Map.of());
        return toAdminItem(publication, true, emails, names);
    }

    static String auditDetails(StartupPitchPublication publication, PitchPublicationStatus previous,
                               PitchPublicationStatus target, String reason) {
        StringBuilder text = new StringBuilder()
                .append("Startup ").append(publication.getUserId())
                .append(", versão ").append(publication.getVersion()).append(". ");
        if (previous == target) {
            text.append("Situação mantida: ").append(target).append(" (sem alteração).");
        } else {
            text.append("Situação anterior: ").append(previous).append(". Nova situação: ").append(target).append('.');
        }
        if (reason != null) {
            text.append(" Motivo: ").append(reason).append('.');
        }
        return text.toString();
    }

    // ============================================================
    // Conteúdo
    // ============================================================

    record Content(String shortPitch, String videoUrl, Map<String, String> leanCanvas) {
        int totalChars() {
            int total = shortPitch.length() + (videoUrl == null ? 0 : videoUrl.length());
            for (String block : leanCanvas.values()) {
                total += block.length();
            }
            return total;
        }
    }

    private Content readFromOnboarding(Long userId) {
        String json = onboardingRepository.findById(userId).map(UserOnboarding::getRespostas).orElse(null);
        Map<String, Object> answers;
        try {
            answers = json == null || json.isBlank() ? Map.of() : objectMapper.readValue(json, MAP_TYPE);
        } catch (JacksonException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_FORMAT);
        }
        return contentOf(answers == null ? Map.of() : answers);
    }

    /** As chaves do front: respostas.pitch (texto) e respostas.pitchLeanCanvas (objeto). */
    static Content contentOf(Map<String, Object> answers) {
        String shortPitch = text(answers.get(SHORT_PITCH_KEY));
        Object stored = answers.get(CANVAS_KEY);
        Map<String, String> canvas = emptyCanvas();
        String videoUrl = null;
        if (stored != null) {
            if (!(stored instanceof Map<?, ?> storedMap)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_FORMAT);
            }
            Object blocks = storedMap.get(CANVAS_BLOCKS_KEY);
            if (blocks != null && !(blocks instanceof Map<?, ?>)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_FORMAT);
            }
            if (blocks instanceof Map<?, ?> blockMap) {
                for (String field : CANVAS_FIELDS) {
                    canvas.put(field, text(blockMap.get(field)));
                }
            }
            String video = text(storedMap.get(VIDEO_KEY));
            videoUrl = video.isEmpty() ? null : video;
        }
        return new Content(shortPitch, videoUrl, canvas);
    }

    static Content validate(Content content) {
        if (content.shortPitch().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, SHORT_PITCH_REQUIRED);
        }
        if (content.totalChars() > MAX_TOTAL_CHARS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, TOO_LONG);
        }
        if (content.videoUrl() != null && !isVideoLink(content.videoUrl())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_VIDEO);
        }
        return content;
    }

    /** Mesma regra do front (parseVideoUrl): http ou https, host do YouTube ou do Vimeo. */
    static boolean isVideoLink(String value) {
        if (value.length() > MAX_VIDEO_URL) {
            return false;
        }
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            host = host.replaceFirst("^(www|m)\\.", "");
            return (scheme.equals("https") || scheme.equals("http")) && VIDEO_HOSTS.contains(host);
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    private static Map<String, String> emptyCanvas() {
        Map<String, String> canvas = new LinkedHashMap<>();
        for (String field : CANVAS_FIELDS) {
            canvas.put(field, "");
        }
        return canvas;
    }

    private static String text(Object value) {
        return value instanceof String string ? string.strip() : "";
    }

    private Map<String, String> canvasOf(StartupPitchPublication publication) {
        Map<String, String> canvas = emptyCanvas();
        try {
            Map<String, Object> stored = objectMapper.readValue(publication.getCanvasJson(), MAP_TYPE);
            for (String field : CANVAS_FIELDS) {
                canvas.put(field, text(stored.get(field)));
            }
        } catch (JacksonException exception) {
            // Gravado por este serviço; se um dia vier quebrado, os blocos saem vazios em vez de 500
        }
        return canvas;
    }

    // ============================================================
    // Montagem
    // ============================================================

    private static Long requireStartup(AuthUser authUser) {
        if (authUser == null || authUser.getRole() != Role.STARTUP) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ONLY_STARTUP);
        }
        return authUser.getId();
    }

    private Map<Long, Integer> latestVersions() {
        Map<Long, Integer> latest = new HashMap<>();
        for (Object[] row : repository.findLatestVersionPerUser()) {
            latest.put((Long) row[0], ((Number) row[1]).intValue());
        }
        return latest;
    }

    private static boolean isCurrent(StartupPitchPublication item, Map<Long, Integer> latest) {
        return Objects.equals(latest.get(item.getUserId()), item.getVersion());
    }

    private static boolean inQueue(StartupPitchPublication item, Map<Long, Integer> latest) {
        return item.getStatus() == PitchPublicationStatus.EM_REVISAO && isCurrent(item, latest);
    }

    private PitchPublicationStatusResponse toOwnerResponse(StartupPitchPublication publication) {
        return new PitchPublicationStatusResponse(
                publication.getId(),
                publication.getVersion(),
                publication.getStatus(),
                publication.getStatus() == PitchPublicationStatus.REMOVIDO ? publication.getReason() : null,
                publication.getSubmittedAt(),
                publication.getReviewedAt(),
                settings.pitchRequerAprovacao(),
                publication.getPitchText(),
                publication.getVideoUrl(),
                canvasOf(publication));
    }

    private PitchModerationItem toAdminItem(StartupPitchPublication publication, boolean current,
                                            Map<Long, String> emails, Map<Long, String> names) {
        String name = names.get(publication.getUserId());
        return new PitchModerationItem(
                publication.getId(),
                publication.getUserId(),
                name == null || name.isBlank() ? null : name,
                emails.get(publication.getUserId()),
                publication.getVersion(),
                publication.getStatus(),
                publication.getReason(),
                current,
                publication.getSubmittedAt(),
                publication.getReviewedAt(),
                publication.getReviewedByUserId() == null ? null : emails.get(publication.getReviewedByUserId()),
                publication.getPitchText(),
                publication.getVideoUrl(),
                canvasOf(publication));
    }
}

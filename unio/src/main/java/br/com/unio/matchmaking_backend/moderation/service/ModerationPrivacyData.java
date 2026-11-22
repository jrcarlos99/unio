package br.com.unio.matchmaking_backend.moderation.service;

import br.com.unio.matchmaking_backend.moderation.entity.AccountModeration;
import br.com.unio.matchmaking_backend.moderation.entity.AccountModerationStatus;
import br.com.unio.matchmaking_backend.moderation.entity.PitchPublicationStatus;
import br.com.unio.matchmaking_backend.moderation.entity.StartupPitchPublication;
import br.com.unio.matchmaking_backend.moderation.repository.AccountModerationRepository;
import br.com.unio.matchmaking_backend.moderation.repository.StartupPitchPublicationRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * D064 (RNF03): dados de moderação do PRÓPRIO titular para a exportação e a exclusão de
 * conta (T13). O que a exclusão apaga, a exportação devolve. Nunca traz e-mail nem id do
 * administrador que decidiu, só a data e o motivo.
 */
@Component
@RequiredArgsConstructor
public class ModerationPrivacyData {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final AccountModerationRepository moderationRepository;
    private final StartupPitchPublicationRepository pitchRepository;
    private final AccountVisibility visibility;
    private final ObjectMapper objectMapper;

    /** Chave {@code moderation} do export. Sem registro vale APROVADO, como no resto do sistema. */
    @Transactional(readOnly = true)
    public Map<String, Object> moderationOf(Long userId) {
        return moderationRepository.findById(userId)
                .map(ModerationPrivacyData::moderationData)
                .orElseGet(ModerationPrivacyData::noModerationRecord);
    }

    /** Chave {@code pitchPublications} do export: envios do titular, do mais recente para o mais antigo. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> pitchPublicationsOf(Long userId) {
        return pitchRepository.findByUserIdOrderByVersionDesc(userId).stream()
                .map(this::publicationData)
                .toList();
    }

    /** Exclusão da conta: os envios do pitch e o registro de moderação do titular. */
    @Transactional
    public void deleteAllOf(Long userId) {
        pitchRepository.deleteByUserId(userId);
        moderationRepository.findById(userId).ifPresent(moderationRepository::delete);
        visibility.invalidate();
    }

    public static Map<String, Object> noModerationRecord() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", AccountModerationStatus.APROVADO.name());
        data.put("hasRecord", false);
        data.put("reason", null);
        data.put("reviewedAt", null);
        return data;
    }

    private static Map<String, Object> moderationData(AccountModeration moderation) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", moderation.getStatus().name());
        data.put("hasRecord", true);
        data.put("reason", moderation.getReason());
        data.put("reviewedAt", moderation.getReviewedAt());
        return data;
    }

    private Map<String, Object> publicationData(StartupPitchPublication publication) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", publication.getId());
        data.put("version", publication.getVersion());
        data.put("status", publication.getStatus().name());
        data.put("submittedAt", publication.getSubmittedAt());
        data.put("reviewedAt", publication.getReviewedAt());
        data.put("removalReason",
                publication.getStatus() == PitchPublicationStatus.REMOVIDO ? publication.getReason() : null);
        data.put("shortPitch", publication.getPitchText());
        data.put("videoUrl", publication.getVideoUrl());
        data.put("leanCanvas", canvasOf(publication.getCanvasJson()));
        return data;
    }

    private Map<String, String> canvasOf(String json) {
        Map<String, String> canvas = new LinkedHashMap<>();
        Map<String, Object> stored;
        try {
            stored = json == null ? Map.of() : objectMapper.readValue(json, MAP_TYPE);
        } catch (JacksonException exception) {
            stored = Map.of();
        }
        for (String field : PitchPublicationService.CANVAS_FIELDS) {
            Object value = stored.get(field);
            canvas.put(field, value instanceof String text ? text : "");
        }
        return canvas;
    }
}

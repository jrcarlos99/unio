package br.com.unio.matchmaking_backend.moderation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

/** D063: leitura do pitch nas respostas do onboarding (chaves do front) e validação. */
class PitchConteudoTest {

    @Test
    void leAsChavesDoFrontEIgnoraBlocosDesconhecidos() {
        PitchPublicationService.Content content = PitchPublicationService.contentOf(Map.of(
                "pitch", "  Pitch curto  ",
                "pitchLeanCanvas", Map.of(
                        "version", 1,
                        "videoUrl", "https://vimeo.com/123",
                        "leanCanvas", Map.of("problem", " Dor ", "solution", 42, "outro", "ignorado"))));
        assertThat(content.shortPitch()).isEqualTo("Pitch curto");
        assertThat(content.videoUrl()).isEqualTo("https://vimeo.com/123");
        assertThat(content.leanCanvas()).containsOnlyKeys(PitchPublicationService.CANVAS_FIELDS);
        assertThat(content.leanCanvas()).containsEntry("problem", "Dor").containsEntry("solution", "");
    }

    @Test
    void semCanvasSalvoOsBlocosVemVazios() {
        PitchPublicationService.Content content = PitchPublicationService.contentOf(Map.of("pitch", "Só o pitch"));
        assertThat(content.videoUrl()).isNull();
        assertThat(content.leanCanvas().values()).allMatch(String::isEmpty);
    }

    @Test
    void formatoDesconhecidoResponde400() {
        assertThatThrownBy(() -> PitchPublicationService.contentOf(Map.of("pitch", "x", "pitchLeanCanvas", "texto")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("formato");
        assertThatThrownBy(() -> PitchPublicationService.contentOf(
                Map.of("pitch", "x", "pitchLeanCanvas", Map.of("leanCanvas", "texto"))))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void linkDeVideoSoDoYoutubeOuDoVimeo() {
        assertThat(PitchPublicationService.isVideoLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).isTrue();
        assertThat(PitchPublicationService.isVideoLink("https://youtu.be/dQw4w9WgXcQ")).isTrue();
        assertThat(PitchPublicationService.isVideoLink("http://player.vimeo.com/video/1")).isTrue();
        assertThat(PitchPublicationService.isVideoLink("javascript:alert(1)")).isFalse();
        assertThat(PitchPublicationService.isVideoLink("https://youtube.com.exemplo.com/x")).isFalse();
        assertThat(PitchPublicationService.isVideoLink("ftp://youtube.com/x")).isFalse();
        assertThat(PitchPublicationService.isVideoLink("https://youtu.be/" + "a".repeat(500))).isFalse();
    }

    @Test
    void limiteTotalDe20000Caracteres() {
        Map<String, Object> answers = Map.of("pitch", "a".repeat(20_000));
        PitchPublicationService.validate(PitchPublicationService.contentOf(answers));
        assertThatThrownBy(() -> PitchPublicationService.validate(
                PitchPublicationService.contentOf(Map.of("pitch", "a".repeat(20_001)))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("20000");
    }
}

package br.com.unio.matchmaking_backend.moderation.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * D063: as duas chaves da moderação, lidas de application.properties (com variável de
 * ambiente no App Service).
 *
 * <ul>
 *   <li>{@code unio.moderation.cadastro-requer-aprovacao} (UNIO_MODERATION_CADASTRO_REQUER_APROVACAO),
 *       padrão false: conta nova entra APROVADO. Com true, entra PENDENTE e fica fora da
 *       descoberta até o ADMIN aprovar.</li>
 *   <li>{@code unio.moderation.pitch-requer-aprovacao} (UNIO_MODERATION_PITCH_REQUER_APROVACAO),
 *       padrão true: o pitch enviado fica EM_REVISAO até o ADMIN aprovar. Com false, publica
 *       direto (o ADMIN ainda pode remover).</li>
 * </ul>
 */
@Component
public class ModerationSettings {

    private final boolean cadastroRequerAprovacao;
    private final boolean pitchRequerAprovacao;

    public ModerationSettings(
            @Value("${unio.moderation.cadastro-requer-aprovacao:false}") boolean cadastroRequerAprovacao,
            @Value("${unio.moderation.pitch-requer-aprovacao:true}") boolean pitchRequerAprovacao) {
        this.cadastroRequerAprovacao = cadastroRequerAprovacao;
        this.pitchRequerAprovacao = pitchRequerAprovacao;
    }

    public boolean cadastroRequerAprovacao() {
        return cadastroRequerAprovacao;
    }

    public boolean pitchRequerAprovacao() {
        return pitchRequerAprovacao;
    }
}

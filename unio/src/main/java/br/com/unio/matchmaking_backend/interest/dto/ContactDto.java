package br.com.unio.matchmaking_backend.interest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** D052: contato do outro lado, só depois do match. Telefone e WhatsApp não existem no back. */
@Schema(description = "Contato do outro lado, exposto só depois do match mútuo (D052)")
public record ContactDto(@Schema(example = "contato@exemplo.com.br") String email) {
}

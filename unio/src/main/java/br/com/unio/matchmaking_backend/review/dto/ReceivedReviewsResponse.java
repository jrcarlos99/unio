package br.com.unio.matchmaking_backend.review.dto;

import java.util.List;

/**
 * Avaliações recebidas pelo usuário logado.
 *
 * @param averageRating média com uma casa decimal, ou null se ainda não há avaliações
 */
public record ReceivedReviewsResponse(Double averageRating, long totalReviews, List<ReviewResponse> reviews) {
}

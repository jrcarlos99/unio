-- T12 — Avaliação pós-interação (RF10)
-- Cada participante avalia o outro uma única vez por reunião realizada.
CREATE TABLE interaction_reviews (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL,
    reviewer_user_id BIGINT NOT NULL,
    reviewed_user_id BIGINT NOT NULL,
    rating INTEGER NOT NULL,
    comment VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_interaction_reviews_meeting
        FOREIGN KEY (meeting_id) REFERENCES meetings (id),
    CONSTRAINT fk_interaction_reviews_reviewer
        FOREIGN KEY (reviewer_user_id) REFERENCES users (id),
    CONSTRAINT fk_interaction_reviews_reviewed
        FOREIGN KEY (reviewed_user_id) REFERENCES users (id),
    CONSTRAINT uk_interaction_reviews_meeting_reviewer UNIQUE (meeting_id, reviewer_user_id),
    CONSTRAINT ck_interaction_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_interaction_reviews_reviewed ON interaction_reviews (reviewed_user_id, created_at DESC);

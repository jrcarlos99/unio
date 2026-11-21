CREATE TABLE match_interests (
    id BIGSERIAL PRIMARY KEY,
    startup_id BIGINT NOT NULL,
    investor_id BIGINT NOT NULL,
    liked_by_user_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_match_interest_startup_investor
        UNIQUE (startup_id, investor_id, liked_by_user_id),
    CONSTRAINT ck_match_interest_status
        CHECK (status IN ('LIKED', 'MATCHED', 'REJECTED')),
    CONSTRAINT ck_match_interest_different_participants
        CHECK (startup_id <> investor_id),
    CONSTRAINT fk_match_interest_startup
        FOREIGN KEY (startup_id) REFERENCES users(id),
    CONSTRAINT fk_match_interest_investor
        FOREIGN KEY (investor_id) REFERENCES users(id),
    CONSTRAINT fk_match_interest_liked_by_user
        FOREIGN KEY (liked_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_match_interests_liked_by_status
    ON match_interests (liked_by_user_id, status);

CREATE INDEX idx_match_interests_investor_status
    ON match_interests (investor_id, status);

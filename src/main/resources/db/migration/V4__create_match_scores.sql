CREATE TABLE match_scores (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    investor_id UUID NOT NULL,
    startup_id UUID NOT NULL,
    score_policy_id BIGINT NOT NULL,
    total_score NUMERIC(10, 4) NOT NULL,
    classification VARCHAR(40) NOT NULL,
    calculated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_match_scores_score_policy
        FOREIGN KEY (score_policy_id)
        REFERENCES score_policies(id),
    CONSTRAINT uk_match_score_investor_startup_policy
        UNIQUE (investor_id, startup_id, score_policy_id)
);

CREATE INDEX idx_match_scores_investor_id
    ON match_scores(investor_id);

CREATE INDEX idx_match_scores_startup_id
    ON match_scores(startup_id);

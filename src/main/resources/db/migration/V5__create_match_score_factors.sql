CREATE TABLE match_score_factors (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_score_id BIGINT NOT NULL,
    dimension VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    rank INTEGER NOT NULL,
    factor_code VARCHAR(100) NOT NULL,
    factor_label VARCHAR(255) NOT NULL,
    factor_score NUMERIC(10, 4) NOT NULL,
    weight_applied NUMERIC(10, 4) NOT NULL,
    explanation TEXT NOT NULL,
    CONSTRAINT fk_match_score_factors_match_score
        FOREIGN KEY (match_score_id)
        REFERENCES match_scores(id)
);

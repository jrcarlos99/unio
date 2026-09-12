CREATE TABLE score_criteria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    score_policy_id BIGINT NOT NULL,
    dimension VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    weight NUMERIC(10, 4) NOT NULL,
    criticality VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL,
    CONSTRAINT fk_score_criteria_score_policy
        FOREIGN KEY (score_policy_id)
        REFERENCES score_policies(id)
);

CREATE INDEX idx_score_criteria_score_policy_id
    ON score_criteria(score_policy_id);
